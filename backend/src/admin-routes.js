import { Router } from 'express'
import { pool } from './db.js'
import xlsx from 'xlsx'

const router = Router()

// ── Auth middleware ──────────────────────────────────────────────────────────

router.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

// ── Helper ───────────────────────────────────────────────────────────────────

async function log(type, product_id = null, product_name = null, details = {}) {
  await pool.query(
    `INSERT INTO operation_logs (type, product_id, product_name, details) VALUES ($1, $2, $3, $4)`,
    [type, product_id, product_name, JSON.stringify(details)]
  )
}

// ── Products ─────────────────────────────────────────────────────────────────

router.get('/products', async (req, res) => {
  try {
    const { id, search, search_alt, group, region, product_type, in_stock, paused,
            manual_price, margin_below, factor_site, factor_wb,
            page = 1, limit = 50 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const params = []
    const where = []

    if (id) {
      params.push(`%${id}%`)
      where.push(`product_id ILIKE $${params.length}`)
    }
    if (search) {
      if (search_alt && search_alt !== search) {
        params.push(`%${search}%`, `%${search_alt}%`)
        where.push(`(name ILIKE $${params.length - 1} OR name ILIKE $${params.length})`)
      } else {
        params.push(`%${search}%`)
        where.push(`name ILIKE $${params.length}`)
      }
    }
    if (group) {
      params.push(group)
      where.push(`group_name = $${params.length}`)
    }
    if (region) {
      params.push(region)
      where.push(`region = $${params.length}`)
    }
    if (product_type) {
      params.push(product_type)
      where.push(`product_type = $${params.length}`)
    }
    if (in_stock === 'true') where.push(`in_stock = true`)
    if (in_stock === 'false') where.push(`in_stock = false`)
    if (paused === 'true') where.push(`paused = true`)
    if (paused === 'false') where.push(`(paused IS NULL OR paused = false)`)
    if (manual_price === 'true') where.push(`(price_site IS NOT NULL OR price_wb IS NOT NULL)`)
    if (margin_below === 'true' && factor_site && factor_wb) {
      params.push(Number(factor_site), Number(factor_wb))
      const fs = params.length - 1
      const fw = params.length
      where.push(`(
        (price_site IS NOT NULL AND price_site::numeric < CEIL(price::numeric * $${fs}))
        OR
        (price_wb   IS NOT NULL AND price_wb::numeric   < CEIL(price::numeric * $${fw}))
      )`)
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const countRes = await pool.query(`SELECT COUNT(*) FROM products ${clause}`, params)

    params.push(Number(limit), offset)
    const result = await pool.query(
      `SELECT product_id, name, group_name, region, price, markup, price_site, price_wb, in_stock, paused, product_type, currency, description, updated_at
       FROM products ${clause}
       ORDER BY group_name, name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    res.json({ products: result.rows, total: parseInt(countRes.rows[0].count) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/products/group-description', async (req, res) => {
  try {
    const { group } = req.query
    if (!group) return res.json({ description: null })
    const r = await pool.query(
      `SELECT description FROM products
       WHERE group_name = $1 AND description IS NOT NULL AND description != ''
       ORDER BY updated_at DESC LIMIT 1`,
      [group]
    )
    res.json({ description: r.rows[0]?.description || null })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/products/regions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT region FROM products WHERE region IS NOT NULL ORDER BY region`
    )
    res.json(result.rows.map(r => r.region))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/products/groups', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT group_name, COUNT(*) as count FROM products GROUP BY group_name ORDER BY group_name`
    )
    res.json(result.rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/products/pause', async (req, res) => {
  try {
    const { ids, paused } = req.body
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids required' })
    await pool.query(
      `UPDATE products SET paused=$1, updated_at=NOW() WHERE product_id = ANY($2)`,
      [paused, ids]
    )
    await log(paused ? 'PRODUCTS_PAUSED' : 'PRODUCTS_RESUMED', null, null, { ids, count: ids.length })
    res.json({ ok: true, count: ids.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/products/:id', async (req, res) => {
  try {
    const { name, price, region, group_name, product_type, in_stock, description, markup, price_site, price_wb } = req.body
    const result = await pool.query(
      `UPDATE products
       SET name=$1, price=$2, region=$3, group_name=$4, product_type=$5,
           in_stock=$6, description=$7, markup=$8, price_site=$9, price_wb=$10, updated_at=NOW()
       WHERE product_id=$11 RETURNING *`,
      [name, price, region, group_name, product_type, in_stock, description,
       markup !== '' && markup != null ? markup : null,
       price_site !== '' && price_site != null ? price_site : null,
       price_wb   !== '' && price_wb   != null ? price_wb   : null,
       req.params.id]
    )
    await log('PRODUCT_UPDATE', req.params.id, name, req.body)
    res.json(result.rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/products/:id', async (req, res) => {
  try {
    const prod = await pool.query('SELECT name FROM products WHERE product_id=$1', [req.params.id])
    await pool.query('DELETE FROM products WHERE product_id=$1', [req.params.id])
    await log('PRODUCT_DELETE', req.params.id, prod.rows[0]?.name)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Detect products that explicitly exclude Russia/CIS
// Checks both region field and product name
const RU_BLOCKED_RE = /without\s+[^)]*\bru\b/i

function isBlockedInRussia(name = '', region = '') {
  return RU_BLOCKED_RE.test(region) || RU_BLOCKED_RE.test(name)
}

// Sync prices/stock from ForeignPay API
export async function syncProducts() {
  const fpRes = await fetch(
    'https://keys.foreignpay.ru/webhook/v2/merchant/get-products?currency=RUB',
    { headers: { Authorization: `Bearer ${process.env.FP_TOKEN}` } }
  )
  const data = await fpRes.json()
  if (!Array.isArray(data)) throw new Error('Invalid API response from FP')

  let updated = 0, inserted = 0, autoPaused = 0
  for (const p of data) {
    const blocked = isBlockedInRussia(p.name, p.region)
    const r = await pool.query(
      `INSERT INTO products (product_id, name, price, in_stock, group_name, product_type, region, description, image, paused, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (product_id) DO UPDATE SET
         price = EXCLUDED.price,
         in_stock = EXCLUDED.in_stock,
         product_type = EXCLUDED.product_type,
         description = COALESCE(EXCLUDED.description, products.description),
         image = COALESCE(EXCLUDED.image, products.image),
         paused = CASE WHEN products.paused = true THEN true ELSE EXCLUDED.paused END,
         updated_at = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [String(p.product_id), p.name, p.price, p.in_stock, p.group, p.type, p.region, p.description || null, p.image || null, blocked]
    )
    if (r.rows[0]?.inserted) inserted++
    else updated++
    if (blocked) autoPaused++
  }

  // Apply group descriptions to products without individual descriptions
  try {
    const sRes = await pool.query(`SELECT value FROM settings WHERE key='group_descriptions'`)
    const raw = sRes.rows[0]?.value
    const groupDescs = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
    for (const [groupName, desc] of Object.entries(groupDescs)) {
      if (!desc) continue
      await pool.query(
        `UPDATE products SET description = $1
         WHERE group_name = $2 AND (description IS NULL OR description = '')`,
        [desc, groupName]
      )
    }
  } catch {}

  await log('SYNC', null, null, { total_from_api: data.length, updated, inserted, auto_paused: autoPaused })
  return { ok: true, updated, inserted, total: data.length, autoPaused }
}

router.post('/products/sync', async (req, res) => {
  try { res.json(await syncProducts()) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Games ─────────────────────────────────────────────────────────────────────

export async function syncGames() {
  const fpRes = await fetch(
    'https://keys.foreignpay.ru/webhook/v2/merchant/get-games',
    { headers: { Authorization: `Bearer ${process.env.FP_TOKEN}` } }
  )
  const data = await fpRes.json()
  if (!Array.isArray(data)) throw new Error('Invalid API response from FP games')

  let updated = 0, inserted = 0
  for (const g of data) {
    const r = await pool.query(
      `INSERT INTO games (game_id, name, group_name, launcher, price, in_stock, region, description, image,
         age_rating, genres, developer, release_date, languages, supported_platforms, updated_at)
       VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
       ON CONFLICT (game_id) DO UPDATE SET
         name=EXCLUDED.name, price=EXCLUDED.price, group_name=EXCLUDED.group_name,
         launcher=EXCLUDED.launcher, in_stock=true, region=EXCLUDED.region,
         description=EXCLUDED.description, image=EXCLUDED.image,
         age_rating=EXCLUDED.age_rating, genres=EXCLUDED.genres,
         developer=EXCLUDED.developer, release_date=EXCLUDED.release_date,
         languages=EXCLUDED.languages, supported_platforms=EXCLUDED.supported_platforms,
         updated_at=NOW()
       RETURNING (xmax = 0) AS inserted`,
      [
        String(g.product_id), g.name, g.launcher || 'Игры', g.launcher || null, g.price,
        g.activation_region, g.description, g.image,
        g.age_rating || null, g.genres || null, g.developer || null,
        g.release_date || null,
        g.languages ? JSON.stringify(g.languages) : null,
        g.supported_platforms || null,
      ]
    )
    if (r.rows[0]?.inserted) inserted++
    else updated++
  }

  await log('GAMES_SYNC', null, null, { total_from_api: data.length, updated, inserted })
  return { ok: true, updated, inserted, total: data.length }
}

router.post('/games/sync', async (req, res) => {
  try { res.json(await syncGames()) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GGSell price sync ────────────────────────────────────────────────────────

export async function syncGGSellPrices() {
  const sRes = await pool.query(`SELECT key, value FROM settings WHERE key IN ('ggsell_api_key')`)
  const s = {}
  for (const r of sRes.rows) { try { s[r.key] = JSON.parse(r.value) } catch { s[r.key] = r.value } }
  const apiKey = s['ggsell_api_key'] || process.env.GGSELL_API_KEY || '3enpcij07jqpid6v0rxe5wb08fje4sgy'

  // Курс ЦБ РФ
  const cbrRes = await fetch('https://www.cbr-xml-daily.ru/daily_json.js')
  const cbr = await cbrRes.json()
  const rate = cbr.Valute.USD.Value * 1.07  // ЦБ + 7% конвертационная наценка

  // Все GGSell продукты
  let offset = 0, ggAll = []
  while (true) {
    const r = await fetch(`https://api.g-engine.net/v2.1/shop/products?limit=25&offset=${offset}`, {
      headers: { 'X-API-Key': apiKey }
    })
    const d = await r.json()
    if (!d.success) throw new Error('GGSell API error: ' + d.message)
    const items = d.data?.items || []
    ggAll.push(...items)
    if (ggAll.length >= d.data?.total || items.length === 0) break
    offset += 25
  }

  // Загружаем номиналы параллельно
  const ggDenoms = {}
  await Promise.all(ggAll.map(async p => {
    const r = await fetch(`https://api.g-engine.net/v2.1/shop/denominations/${p.id}`, {
      headers: { 'X-API-Key': apiKey }
    })
    const d = await r.json()
    ggDenoms[p.id] = { product: p, denoms: (d.data || []).filter(x => x.stock > 0) }
  }))

  // Все наши товары из БД
  const prodRes = await pool.query(`SELECT product_id, name FROM products WHERE in_stock = true AND (paused IS NULL OR paused = false)`)

  let matched = 0, updated = 0

  for (const prod of prodRes.rows) {
    const name = prod.name.toUpperCase()

    // Ищем GGSell номинал по совпадению числа и валюты в имени товара
    let bestDenom = null
    let bestProduct = null

    for (const { product: ggProd, denoms } of Object.values(ggDenoms)) {
      for (const denom of denoms) {
        const val = (denom.value || '').toUpperCase()
        const m = val.match(/^(\d+(?:\.\d+)?)\s+([A-Z]+)$/)
        if (!m) continue
        const [, amt, cur] = m
        // Точное совпадение суммы и валюты в имени нашего товара
        if (name.includes(' ' + amt + ' ') && name.includes(cur)) {
          // Берём ближайшее по сумме USD (не дороже FP)
          const ggRub = denom.price * rate
          if (!bestDenom || ggRub < bestDenom.price * rate) {
            bestDenom = denom
            bestProduct = ggProd
          }
        }
      }
    }

    if (bestDenom) {
      matched++
      const ggRub = bestDenom.price * rate
      // Обновляем: сохраняем GGSell цену и denomination_id, ставим supplier=gg
      await pool.query(
        `UPDATE products SET ggsell_denomination_id=$1, ggsell_price=$2, supplier='gg', updated_at=NOW() WHERE product_id=$3`,
        [bestDenom.id, ggRub, prod.product_id]
      )
      updated++
    }
  }

  // Товары без совпадения — возвращаем на fp
  await pool.query(`
    UPDATE products SET supplier='fp', ggsell_denomination_id=NULL, ggsell_price=NULL
    WHERE ggsell_denomination_id IS NULL AND supplier='gg'
  `)

  await log('GGSELL_PRICE_SYNC', null, null, { matched, updated, rate: rate.toFixed(2) })
  return { ok: true, matched, updated, rate: rate.toFixed(2) }
}

router.post('/ggsell/sync-prices', async (req, res) => {
  try { res.json(await syncGGSellPrices()) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GGSell proxy ──────────────────────────────────────────────────────────────

router.get('/ggsell/products', async (req, res) => {
  try {
    const apiKey = process.env.GGSELL_API_KEY || '3enpcij07jqpid6v0rxe5wb08fje4sgy'
    const qs = new URLSearchParams(req.query).toString()
    const r = await fetch(`https://api.g-engine.net/v2.1/shop/products${qs ? '?' + qs : ''}`, {
      headers: { 'X-API-Key': apiKey }
    })
    res.json(await r.json())
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/ggsell/denominations/:product_id', async (req, res) => {
  try {
    const apiKey = process.env.GGSELL_API_KEY || '3enpcij07jqpid6v0rxe5wb08fje4sgy'
    const r = await fetch(`https://api.g-engine.net/v2.1/shop/denominations/${req.params.product_id}`, {
      headers: { 'X-API-Key': apiKey }
    })
    res.json(await r.json())
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/ggsell/currencies', async (req, res) => {
  try {
    const apiKey = process.env.GGSELL_API_KEY || '3enpcij07jqpid6v0rxe5wb08fje4sgy'
    const r = await fetch('https://api.g-engine.net/v2.1/currencies', {
      headers: { 'X-API-Key': apiKey }
    })
    res.json(await r.json())
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/ggsell/balance', async (req, res) => {
  try {
    const apiKey = process.env.GGSELL_API_KEY || '3enpcij07jqpid6v0rxe5wb08fje4sgy'
    const r = await fetch('https://api.g-engine.net/v2.1/users/balance', {
      headers: { 'X-API-Key': apiKey }
    })
    res.json(await r.json())
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Settings (markup) ────────────────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings')
    const settings = {}
    for (const row of result.rows) {
      try { settings[row.key] = JSON.parse(row.value) } catch { settings[row.key] = row.value }
    }
    res.json(settings)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/settings', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, JSON.stringify(value)]
      )
    }
    await log('SETTINGS_UPDATE', null, null, req.body)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── ForeignPay balance ────────────────────────────────────────────────────────

router.get('/fp/balance', async (req, res) => {
  try {
    const fpRes = await fetch('https://acquiring.foreignpay.ru/webhook/my_balance', {
      headers: { Authorization: `Bearer ${process.env.FP_TOKEN}` },
    })
    const data = await fpRes.json()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Wildberries commission sync ───────────────────────────────────────────────

export async function syncWbCommissions() {
  const settingsRes = await pool.query(
    `SELECT key, value FROM settings WHERE key IN ('wb_marina_token', 'wb_tatyana_token')`
  )
  const s = {}
  for (const row of settingsRes.rows) s[row.key] = row.value
  const token = s['wb_marina_token'] || s['wb_tatyana_token']
  if (!token) throw new Error('Нет токена WB — заполните токен в разделе Wildberries')

  const res = await fetch('https://common-api.wildberries.ru/api/v1/tariffs/commission', {
    headers: { Authorization: token },
  })
  if (!res.ok) throw new Error(`WB API вернул ${res.status}`)
  const data = await res.json()
  const commissions = data.report || data

  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
    ['wb_commissions_cache', JSON.stringify(commissions)]
  )
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
    ['wb_commissions_updated_at', JSON.stringify(new Date().toISOString())]
  )
  return { ok: true, count: Array.isArray(commissions) ? commissions.length : 0 }
}

router.post('/wb/sync-commissions', async (req, res) => {
  try {
    const result = await syncWbCommissions()
    await log('WB_COMMISSIONS_SYNC', null, null, result)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── WB артикулы: синхронизация и сопоставление с нашими товарами ─────────────

export async function syncWbArticles() {
  const settingsRes = await pool.query(
    `SELECT key, value FROM settings WHERE key IN ('wb_marina_token', 'wb_tatyana_token')`
  )
  const s = {}
  for (const row of settingsRes.rows) s[row.key] = row.value
  const token = s['wb_marina_token'] || s['wb_tatyana_token']
  if (!token) throw new Error('Нет токена WB')

  // Получаем все товары постранично
  let offset = 0
  const limit = 1000
  const all = []
  while (true) {
    const res = await fetch(
      `https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: token } }
    )
    if (!res.ok) throw new Error(`WB API вернул ${res.status}`)
    const data = await res.json()
    const list = data?.data?.listGoods || []
    all.push(...list)
    if (list.length < limit) break
    offset += limit
  }

  let matched = 0
  let unmatched = 0

  for (const g of all) {
    // vendorCode вида "V-APPLE-1845" → product_id = "1845"
    // Пропускаем EDBS-дубли (второй аккаунт) и не-V-артикулы
    if (!g.vendorCode.startsWith('V-')) continue
    const parts = g.vendorCode.split('-')
    const productId = parts[parts.length - 1]

    const r = await pool.query(
      `UPDATE products SET wb_nmid=$1, wb_article=$2, updated_at=NOW()
       WHERE product_id=$3 RETURNING product_id`,
      [g.nmID, g.vendorCode, productId]
    )
    if (r.rows.length > 0) matched++
    else unmatched++
  }

  await log('WB_ARTICLES_SYNC', null, null, { total: all.length, matched, unmatched })
  return { ok: true, total: all.length, matched, unmatched }
}

router.post('/wb/sync-articles', async (req, res) => {
  try {
    const result = await syncWbArticles()
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── WB: push prices via API ───────────────────────────────────────────────────

const ENTREPRENEUR_TAX_WB = { marina: 8, tatyana: 6 }

export async function syncWbPrices() {
  const sRes = await pool.query(`SELECT key, value FROM settings`)
  const s = {}
  for (const row of sRes.rows) {
    try { s[row.key] = JSON.parse(row.value) } catch { s[row.key] = row.value }
  }

  const marinaToken  = s['wb_marina_token']
  const tatyanaToken = s['wb_tatyana_token']
  if (!marinaToken && !tatyanaToken) throw new Error('Нет токена WB')

  const targetMargin = parseFloat(s['markup_global']) || 0
  const wbCommission = parseFloat(s['wb_commission']) || 25
  const entKey = (s['active_entrepreneur'] || 'tatyana').toString().replace(/"/g, '')
  const tax = ENTREPRENEUR_TAX_WB[entKey] ?? 6
  const wbDeduct = wbCommission + tax
  const factor = (1 + targetMargin / 100) / (1 - wbDeduct / 100)

  // Load all products linked to WB
  const pRes = await pool.query(`
    SELECT product_id, price, price_wb, wb_nmid, wb_article
    FROM products
    WHERE wb_nmid IS NOT NULL AND (paused IS NULL OR paused = false) AND in_stock = true
  `)

  if (pRes.rows.length === 0) return { ok: true, pushed: 0, skipped: 0 }

  // Group by token (V-MARINA-* → marina, V-TATYANA-* or V-* → tatyana)
  const byToken = { [marinaToken]: [], [tatyanaToken]: [] }
  for (const p of pRes.rows) {
    const price = p.price_wb != null
      ? Math.ceil(parseFloat(p.price_wb))
      : Math.ceil(parseFloat(p.price) * factor)

    const isMarina = p.wb_article?.toUpperCase().includes('MARINA')
    const token = isMarina ? marinaToken : tatyanaToken
    if (!token) continue
    if (!byToken[token]) byToken[token] = []
    byToken[token].push({ nmID: Number(p.wb_nmid), price })
  }

  let pushed = 0
  let errors = 0

  // WB Prices API: 10 req/6s, max 3000 nmIDs per batch.
  // On 429 → read X-Ratelimit-Retry and wait exactly that many seconds.
  const delay = (ms) => new Promise(r => setTimeout(r, ms))
  const BATCH_SIZE = 1000
  const BATCH_DELAY_MS = 700  // 700ms between batches → ~1.4 req/s, within 10/6s limit

  let firstBatch = true
  for (const [token, items] of Object.entries(byToken)) {
    if (!token || items.length === 0) continue
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      if (!firstBatch) await delay(BATCH_DELAY_MS)
      firstBatch = false
      const batch = items.slice(i, i + BATCH_SIZE)
      const res = await fetch('https://discounts-prices-api.wildberries.ru/api/v2/upload/task', {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: batch }),
      })
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('X-Ratelimit-Retry') || '60')
        console.log(`[WB prices] 429 — waiting ${retryAfter}s`)
        await delay(retryAfter * 1000)
        errors += batch.length  // count as error, will retry next manual run
        continue
      }
      const data = await res.json()
      if (res.ok && !data.error) pushed += batch.length
      else errors += batch.length
    }
  }

  await log('WB_PRICES_SYNC', null, null, { pushed, errors, total: pRes.rows.length })
  return { ok: true, pushed, errors, total: pRes.rows.length }
}

router.post('/wb/sync-prices', async (req, res) => {
  try { res.json(await syncWbPrices()) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/wb/reset-nmids', async (req, res) => {
  try {
    const { group } = req.body
    if (group) {
      await pool.query(`UPDATE products SET wb_nmid=NULL, wb_article=NULL WHERE group_name=$1`, [group])
    } else {
      await pool.query(`UPDATE products SET wb_nmid=NULL, wb_article=NULL`)
    }
    const cnt = await pool.query(`SELECT COUNT(*) FROM products WHERE wb_nmid IS NOT NULL`)
    res.json({ ok: true, remaining: parseInt(cnt.rows[0].count) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── WB: push product cards (Content API) ─────────────────────────────────────

const WB_CONTENT = 'https://content-api.wildberries.ru/content/v2'
const WB_SUBJECT_GAMING = 8214  // Подписки игровых сервисов

// Maps product name → local image filename in /media/apple/
function appleImageFile(name) {
  const n = name.toUpperCase()

  if (n.includes('RUB') || n.includes('РОССИЯ') || n.includes('RUSSIA')) {
    for (const amt of [1500, 2000, 2500, 3000, 5000]) {
      if (n.includes(String(amt))) return `APPLE ID Россия РФ RUB ${amt} рублей.jpg`
    }
    return 'APPLE ID Россия РФ RUB 2000 рублей.jpg'
  }
  if (n.includes('USD') || n.includes('USA')) {
    for (const amt of [4,5,6,7,8,10,15,20,25,30,40,50,60,70,75,80,90,100,150,200,250,300,400,500]) {
      if (new RegExp(`\\b${amt}\\b`).test(name)) return `APPLE ID ${amt} долларов США USD USA.jpg`
    }
    return 'APPLE ID 10 долларов США USD USA.jpg'
  }
  if (n.includes('AED')) return 'APPLE ID 100 AED ОАЭ.jpg'
  if (n.includes('PLN')) return 'APPLE ID 100 PLN Польша.jpg'
  return 'Apple 2.png'
}

router.post('/wb/push-group-cards', async (req, res) => {
  try {
    const { group, token_key = 'tatyana' } = req.body
    if (!group) return res.status(400).json({ error: 'group required' })

    // Get token
    const sRes = await pool.query(`SELECT key, value FROM settings WHERE key IN ('wb_marina_token','wb_tatyana_token','wb_commission','markup_global','active_entrepreneur')`)
    const s = {}
    for (const row of sRes.rows) { try { s[row.key] = JSON.parse(row.value) } catch { s[row.key] = row.value } }

    const token = token_key === 'marina' ? s['wb_marina_token'] : s['wb_tatyana_token']
    if (!token) return res.status(400).json({ error: `Токен ${token_key} не найден` })

    // Get products for the group
    const pRes = await pool.query(`
      SELECT product_id, name, description, region, price, price_wb, markup, group_name
      FROM products
      WHERE group_name = $1 AND in_stock = true AND (paused IS NULL OR paused = false)
      ORDER BY name
    `, [group])

    if (pRes.rows.length === 0) return res.json({ ok: true, created: 0, errors: 0, message: 'Товаров не найдено' })

    // Get backend public URL
    const backendUrl = process.env.BACKEND_URL || 'https://rbxprincess2012-coin2game-24d0.twc1.net'

    // Determine image folder by group
    const imgFolder = group === 'APPLE ID' ? 'apple' : group.toLowerCase().replace(/\s+/g, '_')

    // Build cards payload
    const vendorPrefix = 'CG'
    const cards = pRes.rows.map(p => {
      const imgFile = group === 'APPLE ID' ? appleImageFile(p.name) : 'Apple 2.png'
      const photoUrl = `${backendUrl}/media/${imgFolder}/${encodeURIComponent(imgFile)}`
      const vendorCode = `${vendorPrefix}-${p.product_id}`

      return {
        subjectID: WB_SUBJECT_GAMING,
        variants: [{
          vendorCode,
          title: p.name,
          description: p.description || p.name,
          brand: group === 'APPLE ID' ? 'Apple' : group,
          photos: [photoUrl],
          characteristics: [
            { id: 249347, value: [p.region || 'Весь мир'] },    // Территория активации
            { id: 15001169, value: [group] },                    // Вид игрового сервиса
          ],
          sizes: [{ wbSize: '', techSize: '0', skus: [] }],
        }],
      }
    })

    // WB Content API limits: /cards/upload — 10 req/min → 6s between batches
    // On 429 — read X-Ratelimit-Retry header and wait exactly that many seconds
    const delay = ms => new Promise(r => setTimeout(r, ms))

    async function wbFetch(url, opts) {
      const r = await fetch(url, opts)
      if (r.status === 429) {
        const retryAfter = parseInt(r.headers.get('X-Ratelimit-Retry') || '60')
        console.log(`[WB] 429 — waiting ${retryAfter}s (X-Ratelimit-Retry)`)
        await delay(retryAfter * 1000)
        return fetch(url, opts)  // one retry
      }
      return r
    }

    // Upload in batches of 10 (safe for 10 req/min Content API limit)
    let created = 0
    let errors = 0
    const createdVendorCodes = []
    const BATCH = 10
    const BATCH_DELAY = 6100  // 6.1s → safely under 10 req/min

    for (let i = 0; i < cards.length; i += BATCH) {
      const batch = cards.slice(i, i + BATCH)
      if (i > 0) await delay(BATCH_DELAY)

      const r = await wbFetch(`${WB_CONTENT}/cards/upload`, {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      const data = await r.json()
      if (!r.ok || data.error) {
        errors += batch.length
        console.error('[WB push-cards] batch error:', JSON.stringify(data))
      } else {
        created += batch.length
        createdVendorCodes.push(...batch.map(c => c.variants[0].vendorCode))
      }
    }

    // Wait for WB to process cards, then fetch nmIDs
    if (createdVendorCodes.length > 0) {
      await delay(15000)  // WB creates cards asynchronously
      let matched = 0
      // Content GET is 100 req/min — 1 request here is fine
      const r = await wbFetch(`${WB_CONTENT}/get/cards/list`, {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { cursor: { limit: 1000 }, filter: { withPhoto: -1 } } }),
      })
      const data = await r.json()
      for (const card of (data?.data?.cards || [])) {
        if (createdVendorCodes.includes(card.vendorCode)) {
          const productId = card.vendorCode.replace(`${vendorPrefix}-`, '')
          await pool.query(
            `UPDATE products SET wb_nmid=$1, wb_article=$2, updated_at=NOW() WHERE product_id=$3`,
            [card.nmID, card.vendorCode, productId]
          )
          matched++
        }
      }
      await log('WB_CARDS_PUSH', null, null, { group, token_key, created, errors, nmids_saved: matched })
      return res.json({ ok: true, created, errors, nmids_saved: matched, total: pRes.rows.length })
    }

    return res.json({ ok: true, created, errors, total: pRes.rows.length })
  } catch (e) {
    console.error('[WB push-cards]', e)
    res.status(500).json({ error: e.message })
  }
})

// ── Logs ─────────────────────────────────────────────────────────────────────

router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const params = []
    const where = []

    if (type) {
      params.push(type)
      where.push(`type = $${params.length}`)
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const countRes = await pool.query(`SELECT COUNT(*) FROM operation_logs ${clause}`, params)

    params.push(Number(limit), offset)
    const result = await pool.query(
      `SELECT * FROM operation_logs ${clause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    res.json({ logs: result.rows, total: parseInt(countRes.rows[0].count) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── WB Excel template export ──────────────────────────────────────────────────

const TYPE_MAP = {
  'APPLE ID':        'подписка на игровой сервис',
  'Nintendo':        'подписка на игровой сервис',
  'Playstation':     'подписка на игровой сервис',
  'Steam':           'подписка на игровой сервис',
  'Xbox':            'подписка на игровой сервис',
  'PUBG Mobile':     'внутренняя игровая валюта',
  'PUBG Battleground': 'внутренняя игровая валюта',
  'Razer Gold':      'внутренняя игровая валюта',
  'Valorant':        'внутренняя игровая валюта',
}

router.get('/wb/export-template', async (req, res) => {
  try {
    // Load settings
    const sRes = await pool.query(`SELECT key, value FROM settings WHERE key IN ('markup_global','wb_commission')`)
    const s = {}
    for (const row of sRes.rows) s[row.key] = row.value
    const targetMargin = parseFloat(s.markup_global) || 10
    const wbCommission = parseFloat(s.wb_commission) || 25
    const TAX = 6 // Татьяна УСН
    const wbDeduct = wbCommission + TAX
    const factor = (1 + targetMargin / 100) / (1 - wbDeduct / 100)

    // Load products
    const pRes = await pool.query(`
      SELECT product_id, name, group_name, region, price, price_wb, wb_article, image, image2, description
      FROM products
      WHERE wb_article IS NOT NULL AND image LIKE '%Media%'
        AND (paused IS NULL OR paused = false)
      ORDER BY group_name, name
    `)
    const products = pRes.rows

    // Load template
    const templatePath = 'D:/Пополнение/_Claude/Подписки игровых сервисов заливааем.xlsx'
    const wb = xlsx.readFile(templatePath)
    const ws = wb.Sheets[wb.SheetNames[0]]

    // Clear existing data rows (row 5+, index 4+)
    const range = xlsx.utils.decode_range(ws['!ref'])
    for (let r = 4; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        delete ws[xlsx.utils.encode_cell({ r, c })]
      }
    }

    // Fill data rows starting at row 5 (index 4)
    const set = (r, c, v) => {
      ws[xlsx.utils.encode_cell({ r, c })] = { v, t: typeof v === 'number' ? 'n' : 's' }
    }

    // Build group number map by group_name order
    const groupMap = {}
    let groupNum = 0
    for (const p of products) {
      if (!(p.group_name in groupMap)) groupMap[p.group_name] = ++groupNum
    }

    products.forEach((p, i) => {
      const r = 4 + i
      const cost = parseFloat(p.price)
      const price = p.price_wb != null ? Math.round(parseFloat(p.price_wb)) : Math.ceil(cost * factor)
      const photos = [p.image, p.image2].filter(Boolean).join(';')
      const subType = TYPE_MAP[p.group_name] || 'подписка на игровой сервис'

      set(r, 0,  groupMap[p.group_name])               // Группа (по игре/сервису)
      set(r, 1,  p.wb_article)                         // Артикул продавца
      set(r, 3,  p.name)                               // Наименование
      set(r, 4,  'Подписки игровых сервисов')          // Категория
      set(r, 6,  p.description || '')                  // Описание
      set(r, 7,  photos)                               // Фото
      set(r, 9,  'Не нужен')                           // КИЗ
      set(r, 10, 0.01)                                 // Вес с упаковкой
      set(r, 12, 'Нет')                                // Только для ИП
      set(r, 14, 1)                                    // Количество
      set(r, 15, 'Нет')                                // Подтверждаю
      set(r, 17, price)                                // Цена
      set(r, 19, 1)                                    // Вес товара
      set(r, 20, 1)                                    // Высота
      set(r, 21, 1)                                    // Длина
      set(r, 22, 1)                                    // Ширина
      set(r, 24, p.group_name)                         // Вид игрового сервиса
      set(r, 27, 'Код пополнения; код активации; электронный ключ') // Комплектация
      set(r, 29, p.region || '')                       // Территория активации
      set(r, 30, subType)                              // Тип подписки
    })

    // Update sheet range
    ws['!ref'] = xlsx.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 4 + products.length - 1, c: range.e.c } })

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename="WB_%D0%A2%D0%B0%D1%82%D1%8C%D1%8F%D0%BD%D0%B0.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buf)

    await log('WB_TEMPLATE_EXPORT', null, null, { count: products.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
