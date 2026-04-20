import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../adminApi'

const TYPE_LABELS = {
  PRODUCT_UPDATE: 'Обновление товара',
  PRODUCT_DELETE: 'Удаление товара',
  SETTINGS_UPDATE: 'Настройки',
  SYNC: 'Синхронизация',
}

const TYPE_COLORS = {
  PRODUCT_UPDATE: 'a-badge--purple',
  PRODUCT_DELETE: 'a-badge--red',
  SETTINGS_UPDATE: 'a-badge--orange',
  SYNC: 'a-badge--green',
}

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const LIMIT = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (typeFilter) params.type = typeFilter
      const data = await adminApi.getLogs(params)
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch {}
    setLoading(false)
  }, [page, typeFilter])

  useEffect(() => { load() }, [load])

  const pages = Math.ceil(total / LIMIT)

  function formatDate(str) {
    return new Date(str).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  function formatDetails(details) {
    if (!details) return '—'
    try {
      const d = typeof details === 'string' ? JSON.parse(details) : details
      return Object.entries(d)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || '—'
    } catch {
      return String(details)
    }
  }

  return (
    <div className="a-page">
      <div className="a-page-header">
        <h2>Журнал операций <span className="a-count">{total}</span></h2>
        <select className="a-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">Все типы</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Тип</th>
              <th>Товар</th>
              <th>ID товара</th>
              <th>Детали</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={5} className="a-loading">Загрузка...</td></tr>
              : logs.length === 0
                ? <tr><td colSpan={5} className="a-loading a-muted">Нет записей</td></tr>
                : logs.map(log => (
                  <tr key={log.id}>
                    <td className="a-muted a-nowrap">{formatDate(log.created_at)}</td>
                    <td>
                      <span className={`a-badge ${TYPE_COLORS[log.type] || 'a-badge--purple'}`}>
                        {TYPE_LABELS[log.type] || log.type}
                      </span>
                    </td>
                    <td>{log.product_name || <span className="a-muted">—</span>}</td>
                    <td className="a-muted">{log.product_id || '—'}</td>
                    <td className="a-muted a-details">{formatDetails(log.details)}</td>
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
    </div>
  )
}
