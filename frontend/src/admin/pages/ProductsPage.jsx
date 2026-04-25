import { useState, useEffect, useCallback, useRef } from 'react'
import { adminApi } from '../adminApi'
import { fixLayout } from '../../utils/layoutFix.js'

const ENTREPRENEURS = [
  { key: 'marina',  label: 'Марина',  taxSystem: 'АУСН', taxRate: 8 },
  { key: 'tatyana', label: 'Татьяна', taxSystem: 'УСН',  taxRate: 6 },
]

function PriceBreakdownModal({ product, settings, priceEdits, entrepreneur, onClose }) {
  const cost    = parseFloat(product.price)
  const taxRate = entrepreneur.taxRate
  const spp     = settings.wbSpp || 0
  const siteDeduct = settings.cpCommission + taxRate
  const wbDeduct   = settings.wbCommission + taxRate

  const edit = priceEdits[product.product_id] || {}
  const effSite = edit.price_site !== undefined
    ? (edit.price_site === '' ? null : parseFloat(edit.price_site))
    : (product.price_site != null ? parseFloat(product.price_site) : null)
  const effWb = edit.price_wb !== undefined
    ? (edit.price_wb === '' ? null : parseFloat(edit.price_wb))
    : (product.price_wb != null ? parseFloat(product.price_wb) : null)

  const autoSitePrice = Math.ceil(cost * (1 + settings.targetMargin / 100) / (1 - siteDeduct / 100))
  const autoWbPrice   = Math.ceil(cost * (1 + settings.targetMargin / 100) / (1 - wbDeduct   / 100))
  const siteSell = effSite ?? autoSitePrice
  const wbSell   = effWb   ?? autoWbPrice
  const autoSite = effSite == null
  const autoWb   = effWb   == null

  const cpAmt  = siteSell * settings.cpCommission / 100
  const sTax   = siteSell * taxRate / 100
  const wbAmt  = wbSell   * settings.wbCommission / 100
  const wTax   = wbSell   * taxRate / 100
  const wbBuyerPrice = wbSell * (1 - spp / 100)

  const siteProfit = siteSell - cpAmt - sTax - cost
  const wbProfit   = wbSell   - wbAmt - wTax - cost
  const siteMargin = (siteProfit / cost) * 100
  const wbMargin   = (wbProfit   / cost) * 100

  const fmt = n => Math.round(n).toLocaleString('ru-RU')
  const ok  = m => m >= settings.targetMargin

  const R = { color: '#e8ecff', dim: 'rgba(232,236,255,0.5)', sep: 'rgba(255,255,255,0.08)' }

  function Row({ label, value, sub, dim, sep, bold, color }) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        padding: sep ? '10px 0 0' : '6px 0',
        borderTop: sep ? `1px solid ${R.sep}` : 'none',
        marginTop: sep ? 6 : 0,
      }}>
        <span style={{ fontSize: '0.82rem', color: dim ? R.dim : R.color, fontWeight: bold ? 600 : 400 }}>
          {label}
          {sub && <span style={{ fontSize: '0.72rem', marginLeft: 5, opacity: 0.5, fontWeight: 400 }}>{sub}</span>}
        </span>
        <span style={{ fontSize: bold ? '0.92rem' : '0.82rem', fontWeight: bold ? 700 : 500, color: color || R.color }}>
          {value}
        </span>
      </div>
    )
  }

  const panelStyle = { flex: 1, padding: '16px 20px 20px' }
  const titleStyle = { fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                       color: R.dim, fontWeight: 600, marginBottom: 12 }

  return (
    <div className="a-backdrop" onClick={onClose}>
      <div className="a-modal" style={{ width: 'min(100%, 600px)' }} onClick={e => e.stopPropagation()}>

        <div className="a-modal-header">
          <div>
            <div style={{ fontSize: '0.72rem', color: R.dim, marginBottom: 2 }}>ID {product.product_id}</div>
            <h3 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.3 }}>{product.name}</h3>
          </div>
          <button className="a-close" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {/* ── Сайт ── */}
          <div style={{ ...panelStyle, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={titleStyle}>Сайт</div>
            <Row label="Цена продажи" sub={autoSite ? 'авто' : 'вручную'} value={`${fmt(siteSell)} ₽`} bold />
            <Row label={`− Комиссия CP (${settings.cpCommission}%)`} value={`−${fmt(cpAmt)} ₽`} dim />
            <Row label={`− Налог ${entrepreneur.taxSystem} (${taxRate}%)`} value={`−${fmt(sTax)} ₽`} dim />
            <Row label="− Себестоимость" value={`−${fmt(cost)} ₽`} dim />
            <Row sep label="Прибыль" value={`${siteProfit >= 0 ? '+' : ''}${fmt(siteProfit)} ₽`} bold color={ok(siteMargin) ? '#4ade80' : '#f87171'} />
            <Row label="Маржа" value={`${siteMargin.toFixed(1)}%`} bold color={ok(siteMargin) ? '#4ade80' : '#f87171'} />
          </div>

          {/* ── WB ── */}
          <div style={panelStyle}>
            <div style={titleStyle}>Wildberries</div>
            <Row label="Цена листинга" sub={autoWb ? 'авто' : 'вручную'} value={`${fmt(wbSell)} ₽`} bold />
            {spp > 0 && <>
              <Row label={`− СПП покупателя (${spp}%)`} value={`−${fmt(wbSell * spp / 100)} ₽`} dim />
              <Row label="Покупатель платит" value={`${fmt(wbBuyerPrice)} ₽`} />
            </>}
            <Row sep label={`− Комиссия WB (${settings.wbCommission}%)`} value={`−${fmt(wbAmt)} ₽`} dim />
            <Row label={`− Налог ${entrepreneur.taxSystem} (${taxRate}%)`} value={`−${fmt(wTax)} ₽`} dim />
            <Row label="− Себестоимость" value={`−${fmt(cost)} ₽`} dim />
            <Row sep label="Прибыль" value={`${wbProfit >= 0 ? '+' : ''}${fmt(wbProfit)} ₽`} bold color={ok(wbMargin) ? '#4ade80' : '#f87171'} />
            <Row label="Маржа" value={`${wbMargin.toFixed(1)}%`} bold color={ok(wbMargin) ? '#4ade80' : '#f87171'} />
          </div>

        </div>

        <div style={{ padding: '10px 20px', fontSize: '0.74rem', color: 'rgba(232,236,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          ИП: {entrepreneur.label} · {entrepreneur.taxSystem} {taxRate}% · Целевая маржа: {settings.targetMargin}% · СПП: {spp}%
        </div>

      </div>
    </div>
  )
}

function EditModal({ product, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product.name || '',
    price: product.price || '',
    region: product.region || '',
    group_name: product.group_name || '',
    product_type: product.product_type || '',
    in_stock: product.in_stock ?? true,
    description: product.description || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave(product.product_id, form)
    setSaving(false)
  }

  return (
    <div className="a-backdrop" onClick={onClose}>
      <div className="a-modal" onClick={e => e.stopPropagation()}>
        <div className="a-modal-header">
          <h3>Редактировать товар</h3>
          <button className="a-close" onClick={onClose}>×</button>
        </div>
        <div className="a-modal-body">
          <label className="a-field">
            <span>Название</span>
            <input value={form.name} onChange={e => set('name', e.target.value)} />
          </label>
          <div className="a-field-row">
            <label className="a-field">
              <span>Цена (₽)</span>
              <input type="number" value={form.price} onChange={e => set('price', e.target.value)} />
            </label>
            <label className="a-field">
              <span>Регион</span>
              <input value={form.region} onChange={e => set('region', e.target.value)} />
            </label>
          </div>
          <div className="a-field-row">
            <label className="a-field">
              <span>Группа</span>
              <input value={form.group_name} onChange={e => set('group_name', e.target.value)} />
            </label>
            <label className="a-field">
              <span>Тип</span>
              <select value={form.product_type || ''} onChange={e => set('product_type', e.target.value)}>
                <option value="">—</option>
                <option value="VOUCHER">VOUCHER</option>
                <option value="TOPUP">TOPUP</option>
                <option value="Game">Game</option>
              </select>
            </label>
            <label className="a-field a-field--check">
              <span>В наличии</span>
              <input type="checkbox" checked={form.in_stock} onChange={e => set('in_stock', e.target.checked)} />
            </label>
          </div>
          <label className="a-field">
            <span>Описание</span>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </label>
        </div>
        <div className="a-modal-footer">
          <button className="a-btn a-btn--ghost" onClick={onClose}>Отмена</button>
          <button className="a-btn a-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MarginLine({ cost, sellPrice, deductionsPct, target }) {
  const style = {
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.68rem',
    marginTop: 3,
    userSelect: 'none',
  }

  if (!sellPrice || !cost) {
    return <div style={style} />
  }

  const net = parseFloat(sellPrice) * (1 - deductionsPct / 100)
  const margin = ((net - parseFloat(cost)) / parseFloat(cost)) * 100
  const netRub = Math.round(net - parseFloat(cost))
  const ok = margin >= target
  const color = ok ? '#4ade80' : '#f87171'

  return (
    <div style={style}>
      <span style={{ color, fontWeight: 600 }}>{margin.toFixed(1)}%</span>
      <span style={{ color: 'rgba(146,162,212,0.6)' }}>₽{netRub.toLocaleString('ru-RU')}</span>
    </div>
  )
}

const EMPTY_FILTERS = { id: '', search: '', group: '', region: '', product_type: '', status: 'active', manual_price: '', margin_below: '' }

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [groups, setGroups] = useState([])
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editing, setEditing] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [settings, setSettings] = useState({ targetMargin: 10, cpCommission: 0, wbCommission: 25 })
  const [shopStopped, setShopStopped] = useState(false)
  const [stoppingShop, setStoppingShop] = useState(false)
  const [breakdown, setBreakdown] = useState(null)
  const [entrepreneurKey, setEntrepreneurKey] = useState('tatyana')
  const [sort, setSort] = useState({ field: null, dir: 'asc' })
  // Local price overrides: { [product_id]: { price_site, price_wb } }
  const [priceEdits, setPriceEdits] = useState({})
  const saveTimers = useRef({})
  const LIMIT = 50

  useEffect(() => {
    adminApi.getGroups().then(rows => setGroups(rows.map(r => r.group_name)))
    adminApi.getRegions().then(setRegions)
    adminApi.getSettings().then(s => {
      setSettings({
        targetMargin: parseFloat(s.markup_global) || 10,
        cpCommission: parseFloat(s.cp_commission) || 0,
        wbCommission: parseFloat(s.wb_commission) || 25,
        wbSpp: parseFloat(s.wb_spp) || 0,
      })
      const raw = s.shop_stopped
      setShopStopped(raw === true || raw === 'true' || raw === '"true"')
      if (s.active_entrepreneur) {
        const key = typeof s.active_entrepreneur === 'string'
          ? s.active_entrepreneur.replace(/"/g, '') : s.active_entrepreneur
        if (ENTREPRENEURS.find(e => e.key === key)) setEntrepreneurKey(key)
      }
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    setPriceEdits({})
    try {
      const params = { page, limit: LIMIT }
      if (filters.id)           params.id           = filters.id
      if (filters.search) {
        const { fixed, wasFixed } = fixLayout(filters.search)
        params.search = filters.search
        if (wasFixed) params.search_alt = fixed
      }
      if (filters.group)        params.group        = filters.group
      if (filters.region)       params.region       = filters.region
      if (filters.product_type) params.product_type = filters.product_type
      if (filters.status === 'active')       { params.in_stock = 'true';  params.paused = 'false' }
      if (filters.status === 'out_of_stock') { params.in_stock = 'false' }
      if (filters.status === 'paused')       { params.paused   = 'true' }
      if (filters.manual_price)   params.manual_price   = filters.manual_price
      if (filters.margin_below === 'true') {
        const ent = ENTREPRENEURS.find(e => e.key === entrepreneurKey) || ENTREPRENEURS[1]
        const tax = ent.taxRate
        const sd  = settings.cpCommission + tax
        const wd  = settings.wbCommission + tax
        params.margin_below = 'true'
        params.factor_site  = (1 + settings.targetMargin / 100) / (1 - sd / 100)
        params.factor_wb    = (1 + settings.targetMargin / 100) / (1 - wd / 100)
      }
      const data = await adminApi.getProducts(params)
      setProducts(data.products || [])
      setTotal(data.total || 0)
    } catch (e) { console.error('load error', e) }
    setLoading(false)
  }, [filters, page, settings, entrepreneurKey])

  useEffect(() => { load() }, [load])

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setSort({ field: null, dir: 'asc' })
    setPage(1)
  }

  const hasFilters = Object.values(filters).some(Boolean) || sort.field !== null

  // ── Selection ──────────────────────────────────────────────────────────────
  const allIds = products.map(p => p.product_id)
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSelected = selected.size > 0

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds))
  }

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBulkPause(paused) {
    setBulkLoading(true)
    await adminApi.pauseProducts([...selected], paused)
    setBulkLoading(false)
    load()
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function handleSave(id, form) {
    await adminApi.updateProduct(id, form)
    setEditing(null)
    load()
  }

  async function handleDelete(id, name) {
    if (!confirm(`Удалить "${name}"?`)) return
    await adminApi.deleteProduct(id)
    load()
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const r = await adminApi.syncAll()
      setSyncResult(r)
    } catch (e) {
      setSyncResult({ error: e.message })
    }
    setSyncing(false)
    load()
    window.dispatchEvent(new Event('fp-sync'))
  }

  async function handleSyncGGSell() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const r = await adminApi.syncGGSellPrices()
      setSyncResult({ gg: r })
    } catch (e) {
      setSyncResult({ error: e.message })
    }
    setSyncing(false)
    load()
  }

  // ── Price inline editing ───────────────────────────────────────────────────
  function getPriceEdit(p, field) {
    const edit = priceEdits[p.product_id]
    if (edit && field in edit) return edit[field]
    const raw = p[field]
    return raw != null ? String(Math.round(parseFloat(raw))) : ''
  }

  function setPriceEdit(productId, field, value) {
    setPriceEdits(prev => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [field]: value },
    }))
  }

  function savePriceField(p, field) {
    const key = `${p.product_id}_${field}`
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(async () => {
      const edit = priceEdits[p.product_id]
      const val = edit?.[field]
      const parsed = val === '' ? null : parseFloat(val)
      if (isNaN(parsed) && val !== '') return
      await adminApi.updateProduct(p.product_id, {
        name: p.name, price: p.price, region: p.region,
        group_name: p.group_name, product_type: p.product_type,
        in_stock: p.in_stock, description: p.description,
        [field]: parsed,
      })
    }, 600)
  }

  // ── Margin calculation ─────────────────────────────────────────────────────
  function autoPrice(cost, deductionsPct) {
    return Math.ceil(parseFloat(cost) * (1 + settings.targetMargin / 100) / (1 - deductionsPct / 100))
  }

  function calcMargin(sellPrice, cost, deductionsPct) {
    if (!sellPrice || !cost) return null
    const net = parseFloat(sellPrice) * (1 - deductionsPct / 100)
    return ((net - parseFloat(cost)) / parseFloat(cost)) * 100
  }

  function getEffectiveSitePrice(p) {
    const edit = priceEdits[p.product_id]?.price_site
    if (edit !== undefined) return edit === '' ? null : parseFloat(edit)
    return p.price_site != null ? parseFloat(p.price_site) : null
  }

  function getEffectiveWbPrice(p) {
    const edit = priceEdits[p.product_id]?.price_wb
    if (edit !== undefined) return edit === '' ? null : parseFloat(edit)
    return p.price_wb != null ? parseFloat(p.price_wb) : null
  }

  function MarginBadge({ sellPrice, cost, deductionsPct }) {
    const margin = calcMargin(sellPrice, cost, deductionsPct)
    if (margin === null) return <span className="a-muted" style={{ fontSize: '0.75rem', display: 'block', textAlign: 'center', marginTop: 3 }}>—</span>
    const ok = margin >= settings.targetMargin
    const netRub = parseFloat(sellPrice) * (1 - deductionsPct / 100) - parseFloat(cost)
    const color = ok ? '#4ade80' : '#f87171'
    return (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, fontSize: '0.72rem', fontWeight: 600, color, marginTop: 3 }}>
        <span style={{ flex: 1, textAlign: 'right', paddingRight: 5 }}>{margin.toFixed(1)}%</span>
        <span style={{ width: 1, height: 10, background: 'currentColor', opacity: 0.3, flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', paddingLeft: 5, fontWeight: 400 }}>{Math.round(netRub)} ₽</span>
      </span>
    )
  }

  async function handleToggleShop() {
    const next = !shopStopped
    if (next && !confirm('Остановить продажи? Сайт перестанет показывать товары покупателям.')) return
    setStoppingShop(true)
    await adminApi.updateSettings({ shop_stopped: next })
    setShopStopped(next)
    setStoppingShop(false)
  }

  const entrepreneur = ENTREPRENEURS.find(e => e.key === entrepreneurKey) || ENTREPRENEURS[1]
  const taxRate = entrepreneur.taxRate

  async function handleSelectEntrepreneur(key) {
    setEntrepreneurKey(key)
    await adminApi.updateSettings({ active_entrepreneur: key })
  }

  function toggleSort(field) {
    setSort(s => s.field === field
      ? s.dir === 'asc' ? { field, dir: 'desc' } : { field: null, dir: 'asc' }
      : { field, dir: 'asc' }
    )
  }

  const pages = Math.ceil(total / LIMIT)
  const siteDeductions = settings.cpCommission + taxRate
  const wbDeductions   = settings.wbCommission + taxRate

  const sortedProducts = sort.field ? [...products].sort((a, b) => {
    const getVal = p => {
      const cost = parseFloat(p.price)
      if (sort.field === 'price') return cost
      const effSite = p.price_site != null ? parseFloat(p.price_site) : autoPrice(cost, siteDeductions)
      const effWb   = p.price_wb   != null ? parseFloat(p.price_wb)   : autoPrice(cost, wbDeductions)
      return sort.field === 'price_site' ? effSite : effWb
    }
    return sort.dir === 'asc' ? getVal(a) - getVal(b) : getVal(b) - getVal(a)
  }) : products

  return (
    <div className="a-page">
      <div className="a-page-header">
        <h2>Товары <span className="a-count">{total}</span></h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {hasFilters && (
            <button className="a-btn a-btn--ghost" onClick={clearFilters}>✕ Сбросить фильтры</button>
          )}

          <div className="a-entrepreneur-toggle">
            {ENTREPRENEURS.map(e => (
              <button
                key={e.key}
                className={`a-entrepreneur-btn${entrepreneurKey === e.key ? ' active' : ''}`}
                onClick={() => handleSelectEntrepreneur(e.key)}
                title={`${e.taxSystem} ${e.taxRate}%`}
              >
                {e.label}
                <span className="a-entrepreneur-badge">{e.taxSystem} {e.taxRate}%</span>
              </button>
            ))}
          </div>

          <button className="a-btn a-btn--primary" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Синхронизация...' : '↻ Синхронизировать с API'}
          </button>
          <button className="a-btn a-btn--ghost" onClick={handleSyncGGSell} disabled={syncing} title="Обновить себестоимость из GGSell по курсу ЦБ">
            ↻ GGSell цены
          </button>
          <button
            className={shopStopped ? 'a-btn a-btn--success' : 'a-btn a-btn--danger'}
            onClick={handleToggleShop}
            disabled={stoppingShop}
            title={shopStopped ? 'Магазин остановлен — нажмите чтобы возобновить' : 'Экстренная остановка всех продаж'}
          >
            {stoppingShop ? '...' : shopStopped ? '▶ Возобновить магазин' : '⏹ Остановить продажи'}
          </button>
        </div>
      </div>

      {shopStopped && (
        <div className="a-alert a-alert--error" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
          Магазин остановлен — товары скрыты от покупателей на сайте и ВБ. Нажмите «Возобновить магазин» чтобы включить обратно.
        </div>
      )}

      {syncResult && (
        <div className={`a-alert a-alert--${syncResult.error ? 'error' : 'success'}`}>
          {syncResult.error
            ? `Ошибка: ${syncResult.error}`
            : syncResult.gg
              ? `GGSell: обновлено ${syncResult.gg.updated} товаров из ${syncResult.gg.matched} совпадений · курс ₽${syncResult.gg.rate}/$`
              : (<>
                  Товары: {syncResult.products?.updated ?? 0} обновлено, {syncResult.products?.inserted ?? 0} добавлено из {syncResult.products?.total ?? 0}
                  {syncResult.products?.autoPaused > 0 && ` · пауза: ${syncResult.products.autoPaused}`}
                  {' · '}Игры: {syncResult.games?.updated ?? 0} / {syncResult.games?.total ?? 0}
                  {syncResult.wb && ` · WB: загружено ${syncResult.wb.pushed ?? 0} цен`}
                </>)
          }
        </div>
      )}

      {someSelected && (
        <div className="a-bulk-bar">
          <span className="a-muted">Выбрано: <b style={{ color: '#e8ecff' }}>{selected.size}</b></span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="a-btn a-btn--sm a-btn--danger" disabled={bulkLoading} onClick={() => handleBulkPause(true)}>
              ⏸ Поставить на паузу
            </button>
            <button className="a-btn a-btn--sm a-btn--ghost" disabled={bulkLoading} onClick={() => handleBulkPause(false)}>
              ▶ Возобновить продажи
            </button>
            <button className="a-btn a-btn--sm a-btn--ghost" onClick={() => setSelected(new Set())}>
              ✕ Снять выделение
            </button>
          </div>
        </div>
      )}

      <div className="a-chip-bar">
        <span className="a-muted" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Быстрые фильтры:</span>
        {[
          { key: 'manual_price', label: 'Цена вручную',     title: 'Товары с вручную установленной ценой сайта или ВБ' },
          { key: 'margin_below', label: 'Маржа ниже цели',  title: `Цена вручную установлена ниже расчётной (маржа < ${settings.targetMargin}%)` },
        ].map(({ key, label, title }) => {
          const active = filters[key] === 'true'
          return (
            <button
              key={key}
              className={`a-chip${active ? ' active' : ''}`}
              title={title}
              onClick={() => setFilter(key, active ? '' : 'true')}
            >{label}</button>
          )
        })}
      </div>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} title="Выбрать всё на странице" />
              </th>
              <th style={{ width: 140 }}>ID</th>
              <th>Название</th>
              <th>Группа</th>
              <th>Регион</th>
              <th>Тип</th>
              <th>Себест.</th>
              <th style={{ width: 130 }}>Цена сайт</th>
              <th style={{ width: 130 }}>Цена ВБ</th>
              <th>Статус</th>
              <th></th>
            </tr>
            <tr className="a-filter-row">
              <td />
              <td>
                <input className="a-col-filter" placeholder="ID..." value={filters.id} onChange={e => setFilter('id', e.target.value)} />
              </td>
              <td>
                <input className="a-col-filter" placeholder="Название..." value={filters.search} onChange={e => setFilter('search', e.target.value)} />
              </td>
              <td>
                <select className="a-col-filter" value={filters.group} onChange={e => setFilter('group', e.target.value)}>
                  <option value="">Все</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </td>
              <td>
                <select className="a-col-filter" value={filters.region} onChange={e => setFilter('region', e.target.value)}>
                  <option value="">Все</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td>
                <select className="a-col-filter" value={filters.product_type} onChange={e => setFilter('product_type', e.target.value)}>
                  <option value="">Все</option>
                  <option value="VOUCHER">VOUCHER</option>
                  <option value="TOPUP">TOPUP</option>
                  <option value="Game">Game</option>
                </select>
              </td>
              {['price', 'price_site', 'price_wb'].map(field => {
                const active = sort.field === field
                const icon = !active ? '↕' : sort.dir === 'asc' ? '↑' : '↓'
                return (
                  <td key={field} style={{ textAlign: 'center' }}>
                    <button
                      className={`a-sort-btn${active ? ' active' : ''}`}
                      onClick={() => toggleSort(field)}
                      title={!active ? 'Сортировать по возрастанию' : sort.dir === 'asc' ? 'Сортировать по убыванию' : 'Сбросить сортировку'}
                    >{icon}</button>
                  </td>
                )
              })}
              <td>
                <select className="a-col-filter" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
                  <option value="">Все</option>
                  <option value="active">Активные</option>
                  <option value="out_of_stock">Нет в наличии</option>
                  <option value="paused">На паузе</option>
                </select>
              </td>
              <td>
                {hasFilters && (
                  <button className="a-btn a-btn--ghost a-btn--sm" onClick={clearFilters} style={{ width: '100%', whiteSpace: 'nowrap' }} title="Сбросить все фильтры">
                    ✕ Сброс
                  </button>
                )}
              </td>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={11} className="a-loading">Загрузка...</td></tr>
              : sortedProducts.map(p => {
                  const cost = parseFloat(p.price)
                  const effSite = getEffectiveSitePrice(p)
                  const effWb   = getEffectiveWbPrice(p)
                  const autoSite = effSite == null
                  const autoWb   = effWb   == null
                  const displaySite = effSite ?? autoPrice(cost, siteDeductions)
                  const displayWb   = effWb   ?? autoPrice(cost, wbDeductions)

                  return (
                    <tr key={p.product_id} className={p.paused ? 'a-row--paused' : ''}>
                      <td>
                        <input type="checkbox" checked={selected.has(p.product_id)} onChange={() => toggleOne(p.product_id)} />
                      </td>
                      <td className="a-nowrap" style={{ fontSize: '0.8rem' }}>
                        <button
                          className="a-id-btn"
                          onClick={() => setBreakdown(p)}
                          title="Показать расчёт цены"
                        >{p.product_id}</button>
                      </td>
                      <td className="a-col-name">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {p.paused && <span className="a-badge a-badge--red" title="На паузе">⏸</span>}
                          <a
                            href={`${window.location.origin}/?product=${p.product_id}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Открыть на сайте"
                            style={{ color: 'inherit', textDecoration: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#c4acff'}
                            onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
                          >
                            {p.name}
                          </a>
                        </div>
                      </td>
                      <td>{p.group_name}</td>
                      <td>{p.region}</td>
                      <td>
                        <span className={`a-badge ${p.product_type === 'TOPUP' ? 'a-badge--orange' : p.product_type === 'Game' ? 'a-badge--green' : 'a-badge--purple'}`}>
                          {p.product_type || '—'}
                        </span>
                      </td>
                      <td>₽{cost.toLocaleString('ru-RU')}</td>

                      {/* Цена сайт */}
                      <td style={{ paddingBottom: 6 }}>
                        <input
                          type="number"
                          className={`a-input a-input--sm a-price-input${autoSite ? ' a-price-input--auto' : ''}`}
                          style={{ textAlign: 'right' }}
                          placeholder={Math.round(displaySite).toLocaleString('ru-RU')}
                          value={getPriceEdit(p, 'price_site')}
                          onChange={e => setPriceEdit(p.product_id, 'price_site', e.target.value)}
                          onBlur={() => savePriceField(p, 'price_site')}
                        />
                        <MarginLine cost={cost} sellPrice={displaySite} deductionsPct={siteDeductions} target={settings.targetMargin} />
                      </td>

                      {/* Цена ВБ */}
                      <td style={{ paddingBottom: 6 }}>
                        <input
                          type="number"
                          className={`a-input a-input--sm a-price-input${autoWb ? ' a-price-input--auto' : ''}`}
                          style={{ textAlign: 'right' }}
                          placeholder={Math.round(displayWb).toLocaleString('ru-RU')}
                          value={getPriceEdit(p, 'price_wb')}
                          onChange={e => setPriceEdit(p.product_id, 'price_wb', e.target.value)}
                          onBlur={() => savePriceField(p, 'price_wb')}
                        />
                        <MarginLine cost={cost} sellPrice={displayWb} deductionsPct={wbDeductions} target={settings.targetMargin} />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className={`a-dot ${p.in_stock ? 'a-dot--green' : 'a-dot--red'}`} />
                        {p.paused && <div className="a-muted" style={{ fontSize: '0.7rem', marginTop: 3 }}>пауза</div>}
                      </td>
                      <td className="a-actions">
                        <button
                          className="a-btn a-btn--sm a-btn--ghost"
                          title={p.paused ? 'Возобновить' : 'Поставить на паузу'}
                          onClick={() => adminApi.pauseProducts([p.product_id], !p.paused).then(() => {
                            setProducts(prev => prev.map(prod =>
                              prod.product_id === p.product_id ? { ...prod, paused: !prod.paused } : prod
                            ))
                          })}
                        >
                          {p.paused ? '▶' : '⏸'}
                        </button>
                        <button className="a-btn a-btn--sm a-btn--ghost" onClick={() => setEditing(p)}>✎</button>
                        <button className="a-btn a-btn--sm a-btn--danger" onClick={() => handleDelete(p.product_id, p.name)}>✕</button>
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="a-pagination">
          <button className="a-btn a-btn--ghost a-btn--sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Назад</button>
          <span className="a-muted">{page} / {pages}</span>
          <button className="a-btn a-btn--ghost a-btn--sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Вперёд →</button>
        </div>
      )}

      {editing && <EditModal product={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
      {breakdown && (
        <PriceBreakdownModal
          product={breakdown}
          settings={settings}
          priceEdits={priceEdits}
          entrepreneur={entrepreneur}
          onClose={() => setBreakdown(null)}
        />
      )}
    </div>
  )
}
