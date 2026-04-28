// v2 — nodemailer + Yandex SMTP
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
import adminRoutes, { syncWbCommissions, syncWbArticles, syncProducts, syncGames, syncWbPrices, syncGGSellPrices, syncGGSellRecharge } from './admin-routes.js'

dotenv.config()

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
// nodemailer removed — using Resend HTTP API instead (Timeweb blocks SMTP ports)

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Static media files (product images for WB)
app.use('/media', express.static(join(__dirname, '..', 'media')))

app.use('/api/admin', adminRoutes)

// ── Local DB routes ──────────────────────────────────────────────────────────

// Helper: get effective markup for a product (product → group → global)
async function getMarkupMap() {
  const result = await pool.query('SELECT key, value FROM settings')
  const map = {}
  for (const row of result.rows) {
    let v = row.value
    try { v = JSON.parse(v) } catch {}
    const n = typeof v === 'number' ? v : parseFloat(v)
    if (!isNaN(n)) map[row.key] = n
    else if (typeof v === 'string') map[row.key] = v
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
  return Math.ceil(deduction > 0 && deduction < 1 ? base / (1 - deduction) : base)
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
      // Support multiple search terms (layout variants) via search_alt param
      const terms = [search, req.query.search_alt].filter(Boolean)
      const termClauses = terms.map(term => {
        const words = term.trim().split(/\s+/).filter(Boolean)
        const wordClauses = words.map(word => {
          params.push(`%${word}%`)
          return `name ILIKE $${params.length}`
        })
        return `(${wordClauses.join(' AND ')})`
      })
      where.push(`(${termClauses.join(' OR ')})`)
    }

    where.push(`(paused IS NULL OR paused = false)`)
    const clause = `WHERE ${where.join(' AND ')}`
    const result = await pool.query(
      `SELECT product_id, name, group_name, region, price, markup, price_site, in_stock, product_type, description, image, sales_count, ggsell_price, supplier
       FROM products ${clause}
       ORDER BY sales_count DESC, group_name, price`,
      params
    )

    const markupMap = await getMarkupMap()
    const products = result.rows.map(p => {
      // Используем GGSell цену как себестоимость если товар привязан к GGSell
      const effectiveCost = (p.supplier === 'gg' && p.ggsell_price) ? p.ggsell_price : p.price
      const sitePrice = p.price_site != null
        ? Math.ceil(parseFloat(p.price_site))
        : applyMarkup(effectiveCost, p.group_name, p.markup, markupMap)
      return ({
      id: p.product_id,
      title: p.name,
      service: p.group_name,
      platform: p.group_name,
      category: 'Цифровые товары',
      price: sitePrice,
      base_price: parseFloat(effectiveCost),
      region: p.region || 'Любой',
      description: p.description || '',
      image: p.image || null,
      in_stock: p.in_stock,
      product_type: p.product_type,
      supplier: p.supplier || 'fp',
      badge: null,
    })})

    res.json({ products })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load products' })
  }
})

// GET /api/product/:id — один товар по product_id (для прямых ссылок)
app.get('/api/product/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT product_id, name, group_name, region, price, markup, price_site, in_stock, product_type, description, image, sales_count, ggsell_price, supplier
       FROM products WHERE product_id = $1`,
      [req.params.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
    const p = result.rows[0]
    const markupMap = await getMarkupMap()
    const effectiveCost = (p.supplier === 'gg' && p.ggsell_price) ? p.ggsell_price : p.price
    res.json({
      id: p.product_id,
      title: p.name,
      service: p.group_name,
      platform: p.group_name,
      category: 'Цифровые товары',
      price: p.price_site != null ? Math.ceil(parseFloat(p.price_site)) : applyMarkup(effectiveCost, p.group_name, p.markup, markupMap),
      base_price: parseFloat(effectiveCost),
      region: p.region || 'Любой',
      description: p.description || '',
      image: p.image || null,
      in_stock: p.in_stock,
      product_type: p.product_type,
      supplier: p.supplier || 'fp',
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
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

// GET /api/instruction?group=X — публичная инструкция по активации для группы
app.get('/api/instruction', async (req, res) => {
  try {
    const group = req.query.group
    if (!group) return res.json({ instruction: null })
    const row = await pool.query(`SELECT value FROM settings WHERE key='group_instructions'`)
    const raw = row.rows[0]?.value
    const map = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
    res.json({ instruction: map[group] || null })
  } catch (e) {
    res.status(500).json({ instruction: null })
  }
})

// In-memory code store: { email → { code, expires } }
const codeSessions = new Map()

async function sendCodeEmail(email, code) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY не задан')

  const from = process.env.MAIL_FROM || 'COIN2GAME <noreply@coin2game.space>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Ваш код входа: ${code}`,
      html: `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07091d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07091d;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">

        <!-- Logo -->
        <tr><td style="padding:0 0 28px;text-align:center">
          <div style="font-size:26px;font-weight:900;letter-spacing:0.04em">
            <span style="color:#f58f1b">COIN</span><span style="color:#865fff">2</span><span style="color:#e8ecff">GAME</span>
          </div>
          <div style="margin-top:6px;font-size:11px;color:rgba(232,236,255,0.35);letter-spacing:0.14em;text-transform:uppercase">Цифровые коды · Мгновенная доставка</div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#0d1424;border-radius:24px;border:1px solid rgba(255,255,255,0.07);overflow:hidden">
          <table width="100%" cellpadding="0" cellspacing="0">

            <!-- Gradient top bar -->
            <tr><td style="background:linear-gradient(90deg,#865fff,#f58f1b);height:3px;line-height:3px;font-size:0">&nbsp;</td></tr>

            <!-- Header -->
            <tr><td style="padding:32px 40px 20px">
              <div style="font-size:20px;font-weight:700;color:#e8ecff;margin-bottom:6px">Код для входа</div>
              <div style="font-size:13px;color:rgba(232,236,255,0.4)">Введите этот код на сайте, чтобы войти в аккаунт</div>
            </td></tr>

            <!-- Divider -->
            <tr><td style="padding:0 40px"><div style="height:1px;background:rgba(255,255,255,0.06)"></div></td></tr>

            <!-- Code -->
            <tr><td style="padding:28px 40px">
              <div style="background:#111827;border-radius:16px;border:1px solid rgba(134,95,255,0.3);padding:28px 24px;text-align:center">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:rgba(134,95,255,0.7);margin-bottom:16px;font-weight:600">Код подтверждения</div>
                <div style="font-size:52px;font-weight:900;letter-spacing:0.22em;color:#f4c06a;font-family:'Courier New',Courier,monospace;line-height:1">${code}</div>
                <div style="margin-top:16px;font-size:12px;color:rgba(232,236,255,0.3)">Действителен 10 минут · Не сообщайте никому</div>
              </div>
            </td></tr>

            <!-- Support -->
            <tr><td style="padding:0 40px 32px">
              <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:14px 20px">
                <div style="font-size:13px;color:rgba(232,236,255,0.4);line-height:1.6">
                  Если вы не запрашивали код — просто проигнорируйте это письмо.
                  Вопросы: <a href="mailto:info@coin2game.space" style="color:#865fff;text-decoration:none">info@coin2game.space</a>
                </div>
              </div>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center">
          <div style="font-size:12px;color:rgba(232,236,255,0.2);line-height:1.8">
            © 2026 COIN2GAME &nbsp;·&nbsp;
            <a href="https://coin2game.space" style="color:rgba(134,95,255,0.5);text-decoration:none">coin2game.space</a>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Resend API error ${res.status}`)
  }
  console.log(`[mail] code sent to ${email} via Resend`)
}

app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  const code = String(Math.floor(1000 + Math.random() * 9000))
  codeSessions.set(email.toLowerCase(), { code, expires: Date.now() + 10 * 60 * 1000 })

  if (!process.env.YANDEX_EMAIL) {
    console.log(`[auth] DEV code for ${email}: ${code}`)
    return res.json({ ok: true, code })
  }

  // Ждём отправки и возвращаем ошибку если не вышло
  try {
    await sendCodeEmail(email, code)
    res.json({ ok: true })
  } catch (e) {
    console.error('[auth] send-code failed:', e.message)
    res.status(500).json({ error: `Не удалось отправить письмо: ${e.message}` })
  }
})

app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: 'email and code required' })

  const session = codeSessions.get(email.toLowerCase())
  if (!session) return res.status(400).json({ error: 'Код не найден или истёк' })
  if (Date.now() > session.expires) {
    codeSessions.delete(email.toLowerCase())
    return res.status(400).json({ error: 'Код истёк, запросите новый' })
  }
  if (session.code !== String(code)) return res.status(400).json({ error: 'Неверный код' })

  codeSessions.delete(email.toLowerCase())
  return res.json({ ok: true, email })
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
    const prod = await pool.query('SELECT supplier FROM products WHERE product_id=$1', [String(req.body.product_id)])
    if (prod.rows[0]?.supplier === 'gg') {
      return res.status(400).json({ error: 'Этот товар доступен только при оплате картой', code: 'GG_CARD_ONLY' })
    }
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
    const prod = await pool.query('SELECT supplier FROM products WHERE product_id=$1', [String(req.body.product_id)])
    if (prod.rows[0]?.supplier === 'gg') {
      return res.status(400).json({ error: 'Этот товар доступен только при оплате картой', code: 'GG_CARD_ONLY' })
    }
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

function orderEmailHtml({ orderNumber, productName, activationCode, instructions, email }) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ваш заказ COIN2GAME</title>
</head>
<body style="margin:0;padding:0;background:#07091d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07091d;padding:40px 16px">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%">

        <!-- Logo -->
        <tr><td style="padding:0 0 28px;text-align:center">
          <div style="font-size:26px;font-weight:900;letter-spacing:0.04em">
            <span style="color:#f58f1b">COIN</span><span style="color:#865fff">2</span><span style="color:#e8ecff">GAME</span>
          </div>
          <div style="margin-top:6px;font-size:11px;color:rgba(232,236,255,0.35);letter-spacing:0.14em;text-transform:uppercase">Цифровые коды · Мгновенная доставка</div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#0d1424;border-radius:24px;border:1px solid rgba(255,255,255,0.07);overflow:hidden">

          <!-- Gradient top bar -->
          <tr><td style="background:linear-gradient(90deg,#865fff,#f58f1b);height:3px;line-height:3px;font-size:0">&nbsp;</td></tr>

          <!-- Header -->
          <tr><td style="padding:32px 40px 24px">
            <div style="font-size:22px;font-weight:700;color:#e8ecff;margin-bottom:8px">Ваш заказ готов</div>
            <div style="font-size:13px;color:rgba(232,236,255,0.4)">
              Заказ&nbsp;<span style="color:#c4b9ff;font-weight:600">#${orderNumber}</span>
              &nbsp;·&nbsp;Код отправлен на&nbsp;<span style="color:rgba(232,236,255,0.6)">${email}</span>
            </div>
          </td></tr>

          <!-- Divider -->
          <tr><td style="padding:0 40px"><div style="height:1px;background:rgba(255,255,255,0.06)"></div></td></tr>

          <!-- Product -->
          <tr><td style="padding:24px 40px">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(232,236,255,0.35);margin-bottom:8px">Товар</div>
            <div style="font-size:17px;font-weight:600;color:#e8ecff">${productName}</div>
          </td></tr>

          <!-- Code block -->
          <tr><td style="padding:0 40px 28px">
            <div style="background:#111827;border-radius:16px;border:1px solid rgba(134,95,255,0.25);padding:28px 24px;text-align:center">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:rgba(134,95,255,0.7);margin-bottom:16px;font-weight:600">Код активации</div>
              <div style="font-size:30px;font-weight:800;letter-spacing:0.18em;color:#f4c06a;font-family:'Courier New',Courier,monospace;word-break:break-all;line-height:1.3">${activationCode}</div>
              <div style="margin-top:16px;font-size:12px;color:rgba(232,236,255,0.3)">Скопируйте код — он одноразовый и действует бессрочно</div>
            </div>
          </td></tr>

          ${instructions ? `
          <!-- Instructions -->
          <tr><td style="padding:0 40px 28px">
            <div style="border-left:3px solid #865fff;padding:16px 20px;background:rgba(134,95,255,0.06);border-radius:0 12px 12px 0">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#a78bff;margin-bottom:10px;font-weight:600">Инструкция по активации</div>
              <div style="font-size:13px;color:rgba(232,236,255,0.65);line-height:1.75;white-space:pre-line">${instructions}</div>
            </div>
          </td></tr>` : ''}

          <!-- Support -->
          <tr><td style="padding:0 40px 32px">
            <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px 20px">
              <div style="font-size:13px;color:rgba(232,236,255,0.45);line-height:1.6">
                Возникли вопросы? Пишите на
                <a href="mailto:info@coin2game.space" style="color:#865fff;text-decoration:none">info@coin2game.space</a>
                — ответим в течение 24 часов.
              </div>
            </div>
          </td></tr>

        </td></tr>
        <!-- end card -->

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center">
          <div style="font-size:12px;color:rgba(232,236,255,0.2);line-height:1.8">
            © 2026 COIN2GAME &nbsp;·&nbsp;
            <a href="https://coin2game.space" style="color:rgba(134,95,255,0.5);text-decoration:none">coin2game.space</a>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendOrderEmail({ email, orderNumber, productName, activationCode, instructions }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  try {
    const from = process.env.MAIL_FROM || 'COIN2GAME <noreply@coin2game.space>'
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [email],
        subject: `Заказ №${orderNumber} — ваш код активации`,
        html: orderEmailHtml({ orderNumber, productName, activationCode, instructions, email }),
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    console.log(`[mail] order email sent to ${email}`)
  } catch (e) {
    console.error('[mail] order email failed:', e.message)
  }
}

// POST /api/cp/complete — верификация CP-транзакции и доставка товара через FP deposit
// POST /api/test-purchase — тестовый заказ без оплаты (только для разработки)
app.post('/api/test-purchase', async (req, res) => {
  // Тестовый заказ — доступен всем, реальных списаний нет
  try {
    const { product_id, email } = req.body
    if (!product_id || !email) return res.status(400).json({ error: 'product_id and email required' })

    const prodRes = await pool.query(`SELECT name, price, group_name FROM products WHERE product_id=$1`, [String(product_id)])
    const productName = prodRes.rows[0]?.name || `Товар #${product_id}`
    const groupName = prodRes.rows[0]?.group_name || null

    let groupInstruction = null
    if (groupName) {
      try {
        const instrRow = await pool.query(`SELECT value FROM settings WHERE key='group_instructions'`)
        const instrMap = instrRow.rows[0]?.value ? JSON.parse(instrRow.rows[0].value) : {}
        groupInstruction = instrMap[groupName] || null
      } catch {}
    }

    const seqRes = await pool.query(`SELECT nextval('order_seq') AS num`)
    const orderNumber = `CG-${seqRes.rows[0].num}`

    const activationCode = `TEST-${Math.random().toString(36).slice(2,6).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`

    await pool.query(
      `INSERT INTO orders (order_number, email, product_id, product_name, product_type, activation_code, price, status, fp_response)
       VALUES ($1,$2,$3,$4,'VOUCHER',$5,$6,'completed',$7)`,
      [orderNumber, email, String(product_id), productName, activationCode, prodRes.rows[0]?.price, JSON.stringify({ test: true })]
    ).catch(() => {})

    pool.query(`UPDATE products SET sales_count = sales_count + 1 WHERE product_id = $1`, [String(product_id)]).catch(() => {})

    const testNote = '⚠️ Это тестовый заказ. Код активации не является реальным.'
    const emailInstruction = groupInstruction ? `${testNote}\n\n${groupInstruction}` : testNote
    if (email) sendOrderEmail({ email, orderNumber, productName, activationCode, instructions: emailInstruction }).catch(() => {})

    res.json({ ok: true, order_number: orderNumber, code: activationCode, voucher_code: activationCode, product_name: productName, instruction: groupInstruction })
  } catch (e) {
    console.error('[test-purchase]', e)
    res.status(500).json({ error: e.message })
  }
})

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

    // Генерируем номер заказа
    const seqRes = await pool.query(`SELECT nextval('order_seq') AS num`)
    const orderNumber = `CG-${seqRes.rows[0].num}`

    // Получаем товар из БД (включая поставщика и группу)
    const prodRes = await pool.query(
      `SELECT name, price, supplier, ggsell_denomination_id, ggsell_service_id, ggsell_type, group_name FROM products WHERE product_id=$1`,
      [String(product_id)]
    )
    const productName = prodRes.rows[0]?.name || `Товар #${product_id}`
    const price = prodRes.rows[0]?.price || null
    const supplier = prodRes.rows[0]?.supplier || 'fp'
    const ggDenomId = prodRes.rows[0]?.ggsell_denomination_id
    const ggServiceId = prodRes.rows[0]?.ggsell_service_id
    const ggType = prodRes.rows[0]?.ggsell_type || 'shop'
    const groupName = prodRes.rows[0]?.group_name || null

    // Инструкция по активации из настроек
    let groupInstruction = null
    if (groupName) {
      try {
        const instrRow = await pool.query(`SELECT value FROM settings WHERE key='group_instructions'`)
        const instrMap = instrRow.rows[0]?.value
          ? JSON.parse(instrRow.rows[0].value) : {}
        groupInstruction = instrMap[groupName] || null
      } catch {}
    }

    let data, activationCode

    if (supplier === 'gg' && ggDenomId) {
      const ggKey = process.env.GGSELL_API_KEY || '3enpcij07jqpid6v0rxe5wb08fje4sgy'
      const ggHeaders = { 'X-API-Key': ggKey, 'Content-Type': 'application/json' }

      if (ggType === 'recharge' && ggServiceId) {
        // ── Покупаем у GGSell Recharge ─────────────────────────────────
        // Параметры игрока из topup_data (Account, Server и т.д.)
        const params = {}
        if (topup_data) {
          for (const [k, v] of Object.entries(topup_data)) {
            params[k] = v
          }
        }
        params['denomination_id'] = ggDenomId

        const orderRes = await fetch(`https://api.g-engine.net/v2.1/recharge/orders/${ggServiceId}`, {
          method: 'POST', headers: ggHeaders,
          body: JSON.stringify(params)
        })
        const orderData = await orderRes.json()
        if (!orderData.success) throw new Error('GGSell recharge failed: ' + orderData.message)

        activationCode = orderData.data?.status || 'completed'
        data = { ...orderData.data, supplier: 'gg-recharge', instruction: groupInstruction }
      } else {
        // ── Покупаем у GGSell Shop ─────────────────────────────────────
        // 1. Создаём заказ (резервирование)
        const orderRes = await fetch('https://api.g-engine.net/v2.1/shop/orders', {
          method: 'POST', headers: ggHeaders,
          body: JSON.stringify({ items: [{ id: ggDenomId, quantity: 1 }] })
        })
        const orderData = await orderRes.json()
        if (!orderData.success) throw new Error('GGSell order failed: ' + orderData.message)
        const ggOrderId = orderData.data?.id

        // 2. Оплачиваем заказ с баланса мерчанта
        const payRes = await fetch(`https://api.g-engine.net/v2.1/shop/orders/${ggOrderId}/pay`, {
          method: 'POST', headers: ggHeaders,
          body: JSON.stringify({})
        })
        const payData = await payRes.json()
        if (!payData.success) throw new Error('GGSell pay failed: ' + payData.message)

        // 3. Извлекаем код активации
        const items = payData.data?.products?.[0]?.denominations?.[0]?.items || []
        activationCode = items[0]?.activation_code || null
        const instruction = payData.data?.products?.[0]?.denominations?.[0]?.items?.[0]?.instruction || null
        data = { ...payData.data, code: activationCode, instruction, supplier: 'gg' }
      }
    } else {
      // ── Покупаем у ForeignPay ──────────────────────────────────────
      const path = product_type === 'TOPUP' ? '/topup/deposit' : '/voucher/deposit'
      const request = {
        product_id: parseInt(product_id),
        email, order_id,
        ...(product_type === 'TOPUP' && topup_data ? topup_data : {}),
      }
      data = await fpPost(FP_PROXY, { path, request })
      activationCode = data?.code || data?.activation_code || data?.voucher_code
        || data?.data?.code || data?.result?.code || null
    }

    // Сохраняем заказ в БД
    await pool.query(
      `INSERT INTO orders (order_number, email, product_id, product_name, product_type, activation_code, price, status, fp_response)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [orderNumber, email, String(product_id), productName, product_type,
       activationCode, price, activationCode ? 'completed' : 'pending', JSON.stringify(data)]
    ).catch(e => console.error('[orders] save failed:', e.message))

    // Увеличиваем счётчик продаж
    pool.query(`UPDATE products SET sales_count = sales_count + 1 WHERE product_id = $1`, [String(product_id)]).catch(() => {})

    // Отправляем письмо с кодом
    if (activationCode && email) {
      const emailInstruction = groupInstruction || data?.instruction || null
      sendOrderEmail({ email, orderNumber, productName, activationCode, instructions: emailInstruction })
    }

    res.json({ ...data, order_number: orderNumber })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// ── Cron jobs ─────────────────────────────────────────────────────────────────

// Каждый час — синхронизация товаров и игр с ForeignPay, затем обновление цен на WB
cron.schedule('0 * * * *', async () => {
  console.log('[cron] FP products+games sync starting...')
  try {
    const [p, g] = await Promise.all([syncProducts(), syncGames()])
    console.log(`[cron] FP sync OK: products updated=${p.updated} inserted=${p.inserted}, games updated=${g.updated} inserted=${g.inserted}`)
  } catch (e) {
    console.error('[cron] FP sync failed:', e.message)
  }
  // GGSell shop prices update after FP sync
  try {
    const gg = await syncGGSellPrices()
    console.log(`[cron] GGSell shop OK: matched=${gg.matched} updated=${gg.updated} rate=${gg.rate}`)
  } catch (e) {
    console.error('[cron] GGSell shop failed:', e.message)
  }
  // GGSell recharge prices update
  try {
    const ggr = await syncGGSellRecharge()
    console.log(`[cron] GGSell recharge OK: matched=${ggr.matched} updated=${ggr.updated} rate=${ggr.rate}`)
  } catch (e) {
    console.error('[cron] GGSell recharge failed:', e.message)
  }

  // WB price push disabled in cron — run manually from admin when needed
  // console.log('[cron] WB prices push starting...')
})

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

app.get('/api/myip', async (req, res) => {
  try {
    const r = await fetch('https://api.ipify.org?format=json')
    const data = await r.json()
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

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
