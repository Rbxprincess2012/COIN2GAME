import { Router } from 'express'
import { pool } from './db.js'

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
    const { id, search, group, region, product_type, in_stock, paused, page = 1, limit = 50 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const params = []
    const where = []

    if (id) {
      params.push(`%${id}%`)
      where.push(`product_id ILIKE $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      where.push(`name ILIKE $${params.length}`)
    }
    if (group) {
      params.push(group)
      where.push(`group_name = $${params.length}`)
    }
    if (region) {
      params.push(`%${region}%`)
      where.push(`region ILIKE $${params.length}`)
    }
    if (product_type) {
      params.push(product_type)
      where.push(`product_type = $${params.length}`)
    }
    if (in_stock === 'true') where.push(`in_stock = true`)
    if (in_stock === 'false') where.push(`in_stock = false`)
    if (paused === 'true') where.push(`paused = true`)
    if (paused === 'false') where.push(`(paused IS NULL OR paused = false)`)

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const countRes = await pool.query(`SELECT COUNT(*) FROM products ${clause}`, params)

    params.push(Number(limit), offset)
    const result = await pool.query(
      `SELECT product_id, name, group_name, region, price, markup, in_stock, paused, product_type, currency, description, updated_at
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
    const { name, price, region, group_name, product_type, in_stock, description, markup } = req.body
    const result = await pool.query(
      `UPDATE products
       SET name=$1, price=$2, region=$3, group_name=$4, product_type=$5,
           in_stock=$6, description=$7, markup=$8, updated_at=NOW()
       WHERE product_id=$9 RETURNING *`,
      [name, price, region, group_name, product_type, in_stock, description,
       markup !== '' ? markup : null, req.params.id]
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
router.post('/products/sync', async (req, res) => {
  try {
    const fpRes = await fetch(
      'https://keys.foreignpay.ru/webhook/v2/merchant/get-products?currency=RUB',
      { headers: { Authorization: `Bearer ${process.env.FP_TOKEN}` } }
    )
    const data = await fpRes.json()
    if (!Array.isArray(data)) return res.status(500).json({ error: 'Invalid API response' })

    let updated = 0
    let inserted = 0
    let autoPaused = 0
    for (const p of data) {
      const blocked = isBlockedInRussia(p.name, p.region)
      const r = await pool.query(
        `INSERT INTO products (product_id, name, price, in_stock, group_name, product_type, region, paused, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (product_id) DO UPDATE SET
           price = EXCLUDED.price,
           in_stock = EXCLUDED.in_stock,
           product_type = EXCLUDED.product_type,
           paused = CASE WHEN products.paused = true THEN true ELSE EXCLUDED.paused END,
           updated_at = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [String(p.product_id), p.name, p.price, p.in_stock, p.group, p.type, p.region, blocked]
      )
      if (r.rows[0]?.inserted) inserted++
      else updated++
      if (blocked) autoPaused++
    }

    await log('SYNC', null, null, { total_from_api: data.length, updated, inserted, auto_paused: autoPaused })
    res.json({ ok: true, updated, inserted, total: data.length, autoPaused })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Games ─────────────────────────────────────────────────────────────────────

router.post('/games/sync', async (req, res) => {
  try {
    const fpRes = await fetch(
      'https://keys.foreignpay.ru/webhook/v2/merchant/get-games',
      { headers: { Authorization: `Bearer ${process.env.FP_TOKEN}` } }
    )
    const data = await fpRes.json()
    if (!Array.isArray(data)) return res.status(500).json({ error: 'Invalid API response', raw: data })

    let updated = 0
    let inserted = 0
    let autoPaused = 0
    for (const g of data) {
      const blocked = isBlockedInRussia(g.name, g.activation_region)
      const r = await pool.query(
        `INSERT INTO products (product_id, name, group_name, price, in_stock, product_type, region, description, image, raw_data, paused, updated_at)
         VALUES ($1,$2,$3,$4,true,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT (product_id) DO UPDATE SET
           name=EXCLUDED.name, price=EXCLUDED.price, group_name=EXCLUDED.group_name,
           in_stock=true, product_type=EXCLUDED.product_type, region=EXCLUDED.region,
           description=EXCLUDED.description, image=EXCLUDED.image,
           raw_data=EXCLUDED.raw_data,
           paused = CASE WHEN products.paused = true THEN true ELSE EXCLUDED.paused END,
           updated_at=NOW()
         RETURNING (xmax = 0) AS inserted`,
        [
          String(g.product_id), g.name, g.launcher || 'Игры', g.price,
          g.product_type || 'Game', g.activation_region,
          g.description, g.image,
          JSON.stringify({ genres: g.genres, developer: g.developer, age_rating: g.age_rating, release_date: g.release_date, languages: g.languages, supported_platforms: g.supported_platforms }),
          blocked,
        ]
      )
      if (r.rows[0]?.inserted) inserted++
      else updated++
      if (blocked) autoPaused++
    }

    await log('GAMES_SYNC', null, null, { total_from_api: data.length, updated, inserted, auto_paused: autoPaused })
    res.json({ ok: true, updated, inserted, total: data.length, autoPaused })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Settings (markup) ────────────────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings')
    const settings = {}
    for (const row of result.rows) settings[row.key] = row.value
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

export default router
