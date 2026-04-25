import { useState, useEffect, useCallback } from 'react'
import { getToken, saveToken, clearToken, adminApi } from './adminApi'
import { API_BASE } from '../config.js'
import ProductsPage from './pages/ProductsPage'
import MarkupPage from './pages/MarkupPage'
import LogsPage from './pages/LogsPage'
import TokensPage from './pages/TokensPage'
import WildberriesPage from './pages/WildberriesPage'
import CategoriesPage from './pages/CategoriesPage'
import './admin.css'

const NAV = [
  { key: 'products',     label: '📦 Товары' },
  { key: 'categories',   label: '🗂 Категории' },
  { key: 'markup',       label: '💰 Наценка' },
  { key: 'wildberries',  label: '🛍 Wildberries' },
  { key: 'logs',         label: '📋 Журнал' },
  { key: 'tokens',       label: '🔑 Токены' },
]

function LoginScreen({ onLogin }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    saveToken(token)
    // Verify token by calling a protected endpoint
    try {
      const res = await fetch(API_BASE + '/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        clearToken()
        setError('Неверный токен')
      } else {
        onLogin()
      }
    } catch {
      setError('Ошибка соединения с сервером')
    }
  }

  return (
    <div className="a-login">
      <div className="a-login-card">
        <div className="a-brand">
          COIN<span>2</span>GAME
          <span className="a-brand-label"> Admin</span>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="a-field">
            <span>Токен доступа</span>
            <input
              type="password"
              className="a-input"
              placeholder="Введите admin token..."
              value={token}
              onChange={e => setToken(e.target.value)}
              autoFocus
            />
          </label>
          {error && <p className="a-error">{error}</p>}
          <button type="submit" className="a-btn a-btn--primary a-btn--full">Войти</button>
        </form>
      </div>
    </div>
  )
}

const BALANCE_KEYS = { rub_balance: 'RUB', usdt_balance: 'USDT' }

function FpBalance() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getFpBalance()
      setData(res)
      setUpdatedAt(new Date())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const hourly = setInterval(refresh, 60 * 60 * 1000)
    window.addEventListener('fp-sync', refresh)
    return () => { clearInterval(hourly); window.removeEventListener('fp-sync', refresh) }
  }, [refresh])

  const fmt = (v) => Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const entries = data
    ? Object.entries(BALANCE_KEYS).map(([k, label]) => [label, data[k]]).filter(([, v]) => v != null)
    : []

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: '0.7rem', color: '#92a2d4', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
        Баланс FP
      </span>
      {loading && <span style={{ fontSize: '0.78rem', color: '#92a2d4' }}>...</span>}
      {!loading && entries.length === 0 && data && (
        <span style={{ fontSize: '0.78rem', color: '#92a2d4' }}>—</span>
      )}
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: '0.7rem', color: '#92a2d4', textTransform: 'uppercase' }}>{k}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4ade80' }}>{fmt(v)}</span>
        </div>
      ))}
      {updatedAt && (
        <span style={{ fontSize: '0.68rem', color: 'rgba(146,162,212,0.35)', whiteSpace: 'nowrap' }}>
          {updatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      <button
        onClick={refresh}
        disabled={loading}
        title="Обновить баланс"
        style={{
          background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
          color: '#92a2d4', fontSize: '0.85rem', padding: '0 2px',
          opacity: loading ? 0.4 : 1, transition: 'opacity 0.15s',
        }}
      >↻</button>
    </div>
  )
}

function GGBalance() {
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setBalance(await adminApi.getGGBalance()) } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const hourly = setInterval(refresh, 60 * 60 * 1000)
    window.addEventListener('fp-sync', refresh)
    return () => { clearInterval(hourly); window.removeEventListener('fp-sync', refresh) }
  }, [refresh])

  const bal = balance?.data?.balance
  const fmt = (v) => Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 16 }}>
      <span style={{ fontSize: '0.7rem', color: '#92a2d4', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
        Баланс GG
      </span>
      {loading
        ? <span style={{ fontSize: '0.78rem', color: '#92a2d4' }}>...</span>
        : bal != null
          ? <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4ade80' }}>${fmt(bal)}</span>
          : <span style={{ fontSize: '0.78rem', color: '#92a2d4' }}>—</span>
      }
      <button onClick={refresh} disabled={loading} style={{
        background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
        color: '#92a2d4', fontSize: '0.85rem', padding: '0 2px',
        opacity: loading ? 0.4 : 1,
      }}>↻</button>
    </div>
  )
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(!!getToken())
  const [page, setPage] = useState('products')

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />

  return (
    <div className="a-shell">
      <aside className="a-sidebar">
        <div className="a-brand">
          COIN<span>2</span>GAME
          <span className="a-brand-label"> Admin</span>
        </div>
        <nav className="a-nav">
          {NAV.map(n => (
            <button
              key={n.key}
              className={`a-nav-item${page === n.key ? ' active' : ''}`}
              onClick={() => setPage(n.key)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <button
          className="a-nav-item a-nav-item--logout"
          style={{ marginTop: 'auto' }}
          onClick={() => { clearToken(); setAuthed(false) }}
        >
          Выйти
        </button>
      </aside>

      <div className="a-main-wrap">
        <header className="a-topbar">
          <FpBalance />
          <GGBalance />
        </header>
        <main className="a-main">
          {page === 'products'    && <ProductsPage />}
          {page === 'categories'  && <CategoriesPage />}
          {page === 'markup'      && <MarkupPage />}
          {page === 'wildberries' && <WildberriesPage />}
          {page === 'logs'        && <LogsPage />}
          {page === 'tokens'      && <TokensPage />}
        </main>
      </div>
    </div>
  )
}
