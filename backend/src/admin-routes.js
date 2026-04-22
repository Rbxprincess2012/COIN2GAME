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
    const { id, search, group, region, product_type, in_stock, paused,
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
      params.push(`%${search}%`)
      where.push(`name ILIKE $${params.length}`)
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
    res.json({ ok: true, updated, inserted, total: data.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
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
