import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../adminApi'

function EditModal({ product, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product.name || '',
    price: product.price || '',
    region: product.region || '',
    group_name: product.group_name || '',
    product_type: product.product_type || '',
    in_stock: product.in_stock ?? true,
    description: product.description || '',
    markup: product.markup ?? '',
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
              <span>Наценка (%)</span>
              <input type="number" placeholder="глобальная" value={form.markup} onChange={e => set('markup', e.target.value)} />
            </label>
          </div>
          <div className="a-field-row">
            <label className="a-field">
              <span>Группа</span>
              <input value={form.group_name} onChange={e => set('group_name', e.target.value)} />
            </label>
            <label className="a-field">
              <span>Регион</span>
              <input value={form.region} onChange={e => set('region', e.target.value)} />
            </label>
          </div>
          <div className="a-field-row">
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

const EMPTY_FILTERS = { id: '', search: '', group: '', region: '', product_type: '', in_stock: '', paused: '' }

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editing, setEditing] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [globalMarkup, setGlobalMarkup] = useState(0)
  const LIMIT = 50

  useEffect(() => {
    adminApi.getGroups().then(rows => setGroups(rows.map(r => r.group_name)))
    adminApi.getSettings().then(s => {
      const val = parseFloat(s.markup_global)
      if (!isNaN(val)) setGlobalMarkup(val)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const params = { page, limit: LIMIT }
      if (filters.id)           params.id           = filters.id
      if (filters.search)       params.search       = filters.search
      if (filters.group)        params.group        = filters.group
      if (filters.region)       params.region       = filters.region
      if (filters.product_type) params.product_type = filters.product_type
      if (filters.in_stock)     params.in_stock     = filters.in_stock
      if (filters.paused)       params.paused       = filters.paused
      const data = await adminApi.getProducts(params)
      setProducts(data.products || [])
      setTotal(data.total || 0)
    } catch {}
    setLoading(false)
  }, [filters, page])

  useEffect(() => { load() }, [load])

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const hasFilters = Object.values(filters).some(Boolean)

  // ── Selection ──────────────────────────────────────────────────────────────
  const allIds = products.map(p => p.product_id)
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
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
    const res = await adminApi.syncProducts()
    setSyncResult(res)
    setSyncing(false)
    load()
  }

  const pages = Math.ceil(total / LIMIT)

  function effectiveMarkup(p) {
    return p.markup != null ? Number(p.markup) : globalMarkup
  }

  function finalPrice(p) {
    const pct = effectiveMarkup(p)
    return Math.round(Number(p.price) * (1 + pct / 100))
  }

  return (
    <div className="a-page">
      <div className="a-page-header">
        <h2>Товары <span className="a-count">{total}</span></h2>
        <div style={{ display: 'flex', gap: 10 }}>
          {hasFilters && (
            <button className="a-btn a-btn--ghost" onClick={clearFilters}>✕ Сбросить фильтры</button>
          )}
          <button className="a-btn a-btn--primary" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Синхронизация...' : '↻ Синхронизировать с API'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="a-alert a-alert--success">
          Синхронизировано: обновлено {syncResult.updated}, добавлено {syncResult.inserted ?? 0} из {syncResult.total}
          {syncResult.autoPaused > 0 && ` · авто-пауза: ${syncResult.autoPaused} (недоступны в РФ)`}
        </div>
      )}

      {someSelected && (
        <div className="a-bulk-bar">
          <span className="a-muted">Выбрано: <b style={{ color: '#e8ecff' }}>{selected.size}</b></span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="a-btn a-btn--sm a-btn--danger"
              disabled={bulkLoading}
              onClick={() => handleBulkPause(true)}
            >
              ⏸ Поставить на паузу
            </button>
            <button
              className="a-btn a-btn--sm a-btn--ghost"
              disabled={bulkLoading}
              onClick={() => handleBulkPause(false)}
            >
              ▶ Возобновить продажи
            </button>
            <button className="a-btn a-btn--sm a-btn--ghost" onClick={() => setSelected(new Set())}>
              ✕ Снять выделение
            </button>
          </div>
        </div>
      )}

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  title="Выбрать всё на странице"
                />
              </th>
              <th style={{ width: 160 }}>ID</th>
              <th>Название</th>
              <th>Группа</th>
              <th>Регион</th>
              <th>Тип</th>
              <th>Себест.</th>
              <th>Наценка</th>
              <th>Итого</th>
              <th>Статус</th>
              <th></th>
            </tr>
            <tr className="a-filter-row">
              <td />
              <td>
                <input
                  className="a-col-filter"
                  placeholder="ID..."
                  value={filters.id}
                  onChange={e => setFilter('id', e.target.value)}
                />
              </td>
              <td>
                <input
                  className="a-col-filter"
                  placeholder="Название..."
                  value={filters.search}
                  onChange={e => setFilter('search', e.target.value)}
                />
              </td>
              <td>
                <select className="a-col-filter" value={filters.group} onChange={e => setFilter('group', e.target.value)}>
                  <option value="">Все</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </td>
              <td>
                <input
                  className="a-col-filter"
                  placeholder="Регион..."
                  value={filters.region}
                  onChange={e => setFilter('region', e.target.value)}
                />
              </td>
              <td>
                <select className="a-col-filter" value={filters.product_type} onChange={e => setFilter('product_type', e.target.value)}>
                  <option value="">Все</option>
                  <option value="VOUCHER">VOUCHER</option>
                  <option value="TOPUP">TOPUP</option>
                  <option value="Game">Game</option>
                </select>
              </td>
              <td colSpan={3} />  {/* Себест. / Наценка / Итого */}
              <td>
                <select className="a-col-filter" value={filters.paused} onChange={e => setFilter('paused', e.target.value)}>
                  <option value="">Все</option>
                  <option value="false">Активные</option>
                  <option value="true">На паузе</option>
                </select>
              </td>
              <td />
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={11} className="a-loading">Загрузка...</td></tr>
              : products.map(p => (
                <tr key={p.product_id} className={p.paused ? 'a-row--paused' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(p.product_id)}
                      onChange={() => toggleOne(p.product_id)}
                    />
                  </td>
                  <td className="a-nowrap a-muted" style={{ fontSize: '0.8rem' }}>{p.product_id}</td>
                  <td className="a-col-name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.paused && <span className="a-badge a-badge--red" title="На паузе">⏸</span>}
                      <span>{p.name}</span>
                    </div>
                  </td>
                  <td>{p.group_name}</td>
                  <td>{p.region}</td>
                  <td>
                    <span className={`a-badge ${p.product_type === 'TOPUP' ? 'a-badge--orange' : p.product_type === 'Game' ? 'a-badge--green' : 'a-badge--purple'}`}>
                      {p.product_type || '—'}
                    </span>
                  </td>
                  <td>₽{Number(p.price).toLocaleString('ru-RU')}</td>
                  <td>
                    {effectiveMarkup(p)}%
                    {p.markup == null && <span className="a-muted" style={{ fontSize: '0.72rem', marginLeft: 4 }}>(глоб.)</span>}
                  </td>
                  <td>₽{finalPrice(p).toLocaleString('ru-RU')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span className={`a-dot ${p.in_stock ? 'a-dot--green' : 'a-dot--red'}`} />
                      {p.paused && <span className="a-muted" style={{ fontSize: '0.75rem' }}>пауза</span>}
                    </div>
                  </td>
                  <td className="a-actions">
                    <button
                      className="a-btn a-btn--sm a-btn--ghost"
                      title={p.paused ? 'Возобновить' : 'Поставить на паузу'}
                      onClick={() => adminApi.pauseProducts([p.product_id], !p.paused).then(load)}
                    >
                      {p.paused ? '▶' : '⏸'}
                    </button>
                    <button className="a-btn a-btn--sm a-btn--ghost" onClick={() => setEditing(p)}>✎</button>
                    <button className="a-btn a-btn--sm a-btn--danger" onClick={() => handleDelete(p.product_id, p.name)}>✕</button>
                  </td>
                </tr>
              ))
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
    </div>
  )
}
