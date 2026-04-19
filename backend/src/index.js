import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { pool } from './db.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// ── Local DB routes ──────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id')
    res.json({ products: result.rows })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load products' })
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

// ── Start ────────────────────────────────────────────────────────────────────

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`))
