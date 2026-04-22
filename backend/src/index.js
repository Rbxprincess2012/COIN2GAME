// Блок для диагностики — пишет в лог сразу после запуска
console.log("=== ДИАГНОСТИКА: ПРИЛОЖЕНИЕ ЗАПУСКАЕТСЯ ===");
console.log("Текущая директория:", process.cwd());
console.log("PORT из окружения:", process.env.PORT);
console.log("DATABASE_URL определена?", !!process.env.DATABASE_URL);
console.log("NODE_ENV:", process.env.NODE_ENV);
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { pool, initDb } from './db.js'
import adminRoutes, { syncWbCommissions, syncWbArticles } from './admin-routes.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/admin', adminRoutes)

// ── Local DB routes ──────────────────────────────────────────────────────────

// Helper: get effective markup for a product (product → group → global)
async function getMarkupMap() {
  const result = await pool.query('SELECT key, value FROM settings')
  const map = {}
  for (const row of result.rows) {
    let v = row.value
    try { v = JSON.parse(v) } catch {}
    map[row.key] = typeof v === 'number' ? v : parseFloat(v)
  }
  return map
}

const ENTREPRENEUR_TAX = { marina: 8, tatyana: 6 }

// Цена продажи на сайте: себестоимость × (1 + маржа%) ÷ (1 − (CP_комиссия% + налог%))
function applyMarkup(price, groupName, productMarkup, markupMap) {
  let pct = productMarkup != null
    ? parseFloat(productMarkup)
    : (markupMap[`markup_${(groupName || '').toLowerCase().replace(/\s+/g, '_')}`] ?? markupMap['markup_global'] ?? 0)
  if (isNaN(pct)) pct = 0
  const cp = parseFloat(markupMap['cp_commission']) || 0
  const entKey = (markupMap['active_entrepreneur'] || 'tatyana').toString().replace(/"/g, '')
  const tax = ENTREPRENEUR_TAX[entKey] ?? 6
  const deduction = (cp + tax) / 100
  const base = parseFloat(price) * (1 + pct / 100)
  return Math.round(deduction > 0 && deduction < 1 ? base / (1 - deduction) : base)
}

// GET /api/products?group=Steam&in_stock=true&search=pubg
app.get('/api/products', async (req, res) => {
  try {
    const stopRow = await pool.query(`SELECT value FROM settings WHERE key='shop_stopped'`)
    const stopped = stopRow.rows[0]?.value
    if (stopped === 'true' || stopped === '"true"' || stopped === true) {
      return res.json({ products: [], stopped: true })
    }

    const { group, in_stock, search } = req.query
    const params = []
    const where = ['price IS NOT NULL']

    if (group) {
      params.push(group)
      where.push(`group_name = $${params.length}`)
    }
    if (in_stock === 'true') {
      where.push(`in_stock = true`)
    }
    if (search) {
      const words = search.trim().split(/\s+/).filter(Boolean)
      for (const word of words) {
        params.push(`%${word}%`)
        where.push(`name ILIKE $${params.length}`)
      }
    }

    where.push(`(paused IS NULL OR paused = false)`)
    const clause = `WHERE ${where.join(' AND ')}`
    const result = await pool.query(
      `SELECT product_id, name, group_name, region, price, markup, price_site, in_stock, product_type, description, image
       FROM products ${clause}
       ORDER BY group_name, price`,
      params
    )

    const markupMap = await getMarkupMap()
    const products = result.rows.map(p => ({
      id: p.product_id,
      title: p.name,
      service: p.group_name,
      platform: p.group_name,
      category: 'Цифровые товары',
      price: p.price_site != null ? Math.round(parseFloat(p.price_site)) : applyMarkup(p.price, p.group_name, p.markup, markupMap),
      base_price: parseFloat(p.price),
      region: p.region || 'Любой',
      description: p.description || '',
      image: p.image || null,
      in_stock: p.in_stock,
      product_type: p.product_type,
      badge: null,
    }))

    res.json({ products })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load products' })
  }
})

// GET /api/groups — группы из БД (только те, у которых есть товары в наличии)
app.get('/api/groups', async (req, res) => {
  try {
    const [groupsRes, settingRes] = await Promise.all([
      pool.query(`
        SELECT group_name,
               COUNT(*) as total,
               COUNT(*) FILTER (WHERE in_stock = true AND (paused IS NULL OR paused = false)) as available
        FROM products
        WHERE price IS NOT NULL
        GROUP BY group_name
        HAVING COUNT(*) FILTER (WHERE in_stock = true AND (paused IS NULL OR paused = false)) > 0
        ORDER BY available DESC
      `),
      pool.query(`SELECT value FROM settings WHERE key='featured_groups'`),
    ])

    let featuredSet = new Set()
    try {
      const raw = settingRes.rows[0]?.value
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(parsed)) featuredSet = new Set(parsed)
    } catch {}

    const groups = groupsRes.rows.map(row => ({
      group: row.group_name,
      icon: null,
      available: parseInt(row.available),
      total: parseInt(row.total),
      featured: featuredSet.has(row.group_name),
    }))

    res.json(groups)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/auth/send-code', (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  const code = Math.floor(1000 + Math.random() * 9000)
  return res.json({ email, code, message: 'Код отправлен на почту' })
})

// ── ForeignPay API proxy ─────────────────────────────────────────────────────

const FP_BASE  = 'https://keys.foreignpay.ru/webhook/v2/merchant'
const FP_PROXY = 'https://keys.foreignpay.ru/webhook/proxy-request-post'
const FP_ACQ   = 'https://acquiring.foreignpay.ru/webhook/check_transaction'
const FP_INFO  = 'https://keys.foreignpay.ru/webhook/product/information'

function fpHeaders() {
  return {
    'Authorization': `Bearer ${process.env.FP_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function fpGet(url) {
  const res = await fetch(url, { headers: fpHeaders() })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { error: text } }
}

async function fpPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: fpHeaders(),
    body: JSON.stringify(body),
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { error: text } }
}

// 1.1 Список продуктов
app.get('/api/fp/products', async (req, res) => {
  try {
    const params = new URLSearchParams({ currency: req.query.currency || 'RUB' })
    if (req.query.type) params.set('type', req.query.type)
    const data = await fpGet(`${FP_BASE}/get-products?${params}`)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 2. Список групп
app.get('/api/fp/groups', async (req, res) => {
  try {
    const params = new URLSearchParams()
    if (req.query.category) params.set('category', req.query.category)
    const data = await fpGet(`${FP_BASE}/get-groups?${params}`)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 3. Форма группы (поля для TOPUP / продукты VOUCHER)
app.get('/api/fp/group-form', async (req, res) => {
  try {
    const group = encodeURIComponent(req.query.group || '')
    const data = await fpGet(`${FP_BASE}/get-group-form?group=${group}`)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 4.2 Покупка ваучера (VOUCHER) — создаёт платёжную ссылку
app.post('/api/fp/voucher/buy', async (req, res) => {
  try {
    const data = await fpPost(FP_PROXY, { path: '/voucher/buy', request: req.body })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 4.2.2 Покупка ваучера через депозит мерчанта
app.post('/api/fp/voucher/deposit', async (req, res) => {
  try {
    const data = await fpPost(FP_PROXY, { path: '/voucher/deposit', request: req.body })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 4.3 Пополнение аккаунта TOPUP — создаёт платёжную ссылку
app.post('/api/fp/topup/buy', async (req, res) => {
  try {
    const data = await fpPost(FP_PROXY, { path: '/topup/check', request: req.body })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 4.3.1 Пополнение TOPUP через депозит мерчанта
app.post('/api/fp/topup/deposit', async (req, res) => {
  try {
    const data = await fpPost(FP_PROXY, { path: '/topup/deposit', request: req.body })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 4.3.2 Статус TOPUP ордера
app.post('/api/fp/topup/status', async (req, res) => {
  try {
    const data = await fpPost(`${FP_BASE}/topup/status`, { transaction_id: req.body.transaction_id })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 5. Статус транзакции эквайринга (SBP)
app.post('/api/fp/transaction/status', async (req, res) => {
  try {
    const data = await fpPost(FP_ACQ, { transaction_uuid: req.body.sbp_uuid })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 5.1 Информация о купленном товаре (код / ваучер / карта)
app.post('/api/fp/product/info', async (req, res) => {
  try {
    const data = await fpPost(FP_INFO, { transaction_id: req.body.sbp_uuid })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 6. Список игр из FP API
app.get('/api/fp/games', async (req, res) => {
  try {
    const data = await fpGet(`${FP_BASE}/get-games`)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/games/meta — доступные лаунчеры
app.get('/api/games/meta', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT launcher FROM games WHERE launcher IS NOT NULL ORDER BY launcher`
    )
    res.json({ launchers: result.rows.map(r => r.launcher) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/games?launcher=STEAM&search=...&limit=24&offset=0
app.get('/api/games', async (req, res) => {
  try {
    const { launcher, search, limit = 24, offset = 0 } = req.query
    const params = []
    const where = ['price IS NOT NULL']

    if (launcher) {
      params.push(launcher)
      where.push(`launcher = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      where.push(`name ILIKE $${params.length}`)
    }

    const clause = `WHERE ${where.join(' AND ')}`
    const countRes = await pool.query(`SELECT COUNT(*) FROM games ${clause}`, params)

    const markupMap = await getMarkupMap()
    params.push(Number(limit), Number(offset))
    const result = await pool.query(
      `SELECT game_id, name, price, markup, launcher, supported_platforms, region,
              genres, developer, image, age_rating, release_date, languages, description
       FROM games ${clause}
       ORDER BY name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    const games = result.rows.map(g => ({
      id: g.game_id,
      title: g.name,
      price: applyMarkup(g.price, 'games', g.markup, markupMap),
      base_price: parseFloat(g.price),
      launcher: g.launcher,
      supported_platforms: g.supported_platforms,
      region: g.region || 'Любой',
      genres: g.genres,
      developer: g.developer,
      image: g.image,
      age_rating: g.age_rating,
      release_date: g.release_date,
      languages: g.languages,
      description: g.description,
      product_type: 'Game',
      category: 'Игры',
    }))

    res.json({ games, total: parseInt(countRes.rows[0].count) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── CloudPayments integration ────────────────────────────────────────────────

async function getCpCredentials() {
  const result = await pool.query(
    `SELECT key, value FROM settings WHERE key IN ('token_cloudpayments', 'token_cloudpayments_secret')`
  )
  const s = {}
  for (const row of result.rows) {
    try { s[row.key] = JSON.parse(row.value) } catch { s[row.key] = row.value }
  }
  return { publicId: s['token_cloudpayments'] || '', secretKey: s['token_cloudpayments_secret'] || '' }
}

// GET /api/config — публичные настройки для фронтенда (без секретов)
app.get('/api/config', async (req, res) => {
  try {
    const { publicId } = await getCpCredentials()
    res.json({ cp_public_id: publicId || null })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/cp/complete — верификация CP-транзакции и доставка товара через FP deposit
app.post('/api/cp/complete', async (req, res) => {
  try {
    const { transaction_id, order_id, product_id, product_type, email, topup_data } = req.body
    const { publicId, secretKey } = await getCpCredentials()

    // Верифицируем транзакцию через CloudPayments API
    if (publicId && secretKey) {
      const cpRes = await fetch(`https://api.cloudpayments.ru/payments/get/${transaction_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${publicId}:${secretKey}`).toString('base64')}`,
        },
        body: JSON.stringify({}),
      })
      const cpData = await cpRes.json()
      if (!cpData.Success || cpData.Model?.Status !== 'Completed') {
        console.error('CP verify failed:', cpData)
        return res.status(400).json({ error: 'Транзакция не подтверждена CloudPayments', detail: cpData?.Message })
      }
    }

    // Доставляем товар через ForeignPay deposit (с нашего баланса мерчанта)
    const path = product_type === 'TOPUP' ? '/topup/deposit' : '/voucher/deposit'
    const request = {
      product_id: parseInt(product_id),
      email,
      order_id,
      ...(product_type === 'TOPUP' && topup_data ? topup_data : {}),
    }
    const data = await fpPost(FP_PROXY, { path, request })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── Cron jobs ─────────────────────────────────────────────────────────────────

// Ежедневно в 03:15 обновляем комиссии WB
cron.schedule('15 3 * * *', async () => {
  console.log('[cron] WB commission sync starting...')
  try {
    const result = await syncWbCommissions()
    console.log(`[cron] WB commission sync OK: ${result.count} categories`)
  } catch (e) {
    console.error('[cron] WB commission sync failed:', e.message)
  }
})

// Ежедневно в 03:20 синхронизируем артикулы WB
cron.schedule('20 3 * * *', async () => {
  console.log('[cron] WB articles sync starting...')
  try {
    const result = await syncWbArticles()
    console.log(`[cron] WB articles sync OK: matched ${result.matched}/${result.total}`)
  } catch (e) {
    console.error('[cron] WB articles sync failed:', e.message)
  }
})

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true, uptime: Math.floor(process.uptime()) })
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message })
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────

const port = process.env.PORT || 4000
// Простой логгер всех запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Получен запрос: ${req.method} ${req.url}`);
    next();
});

initDb()
  .then(() => console.log('Tables OK'))
  .catch(e => console.error('[db] initDb failed:', e.message))

app.listen(port, () => console.log(`Backend running on http://localhost:${port}`))
