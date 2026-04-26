import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  { key: 'products',    label: 'Товары',      icon: '📦' },
  { key: 'categories',  label: 'Категории',   icon: '🗂' },
  { key: 'markup',      label: 'Наценка',     icon: '💰' },
  { key: 'wildberries', label: 'Wildberries', icon: '🛍' },
  { key: 'logs',        label: 'Журнал',      icon: '📋' },
  { key: 'tokens',      label: 'Токены',      icon: '🔑' },
]

const SIDEBAR_W = 220
const SIDEBAR_COLLAPSED_W = 56

function LoginScreen({ onLogin }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    saveToken(token)
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
      <motion.div
        className="a-login-card"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      >
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
      </motion.div>
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
      <button onClick={refresh} disabled={loading} title="Обновить баланс" style={{
        background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
        color: '#92a2d4', fontSize: '0.85rem', padding: '0 2px',
        opacity: loading ? 0.4 : 1, transition: 'opacity 0.15s',
      }}>↻</button>
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
        color: '#92a2d4', fontSize: '0.85rem', padding: '0 2px', opacity: loading ? 0.4 : 1,
      }}>↻</button>
    </div>
  )
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(!!getToken())
  const [page, setPage] = useState('products')
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === '1' } catch { return false }
  })

  function toggleSidebar() {
    setCollapsed(v => {
      const next = !v
      try { localStorage.setItem('admin_sidebar_collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />

  return (
    <div className="a-shell">
      <motion.aside
        className="a-sidebar"
        animate={{ width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ overflow: 'hidden' }}
      >
        {/* Brand */}
        <div className="a-brand" style={{ padding: collapsed ? '0 0 20px' : '0 8px 24px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <AnimatePresence mode="wait">
            {collapsed ? (
              <motion.span
                key="short"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: 0 }}
              >
                C<span style={{ color: '#865fff' }}>2</span>
              </motion.span>
            ) : (
              <motion.span
                key="full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ whiteSpace: 'nowrap' }}
              >
                COIN<span>2</span>GAME
                <span className="a-brand-label"> Admin</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="a-nav">
          {NAV.map(n => (
            <motion.button
              key={n.key}
              className={`a-nav-item${page === n.key ? ' active' : ''}`}
              onClick={() => setPage(n.key)}
              title={collapsed ? n.label : undefined}
              whileHover={{ x: collapsed ? 0 : 3 }}
              whileTap={{ scale: 0.96 }}
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '10px 12px',
              }}
            >
              <span style={{ fontSize: collapsed ? '1.1rem' : '1rem', flexShrink: 0 }}>{n.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', marginLeft: 10 }}
                  >
                    {n.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </nav>

        {/* Bottom: logout + toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <motion.button
            className="a-nav-item a-nav-item--logout"
            onClick={() => { clearToken(); setAuthed(false) }}
            title={collapsed ? 'Выйти' : undefined}
            whileTap={{ scale: 0.96 }}
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '10px 12px',
            }}
          >
            <span style={{ fontSize: collapsed ? '1.1rem' : '1rem', flexShrink: 0 }}>🚪</span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap', marginLeft: 10 }}
                >
                  Выйти
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Collapse toggle */}
          <motion.button
            onClick={toggleSidebar}
            title={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
            whileHover={{ background: 'rgba(255,255,255,0.06)' }}
            whileTap={{ scale: 0.94 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end',
              padding: '8px 10px', borderRadius: 10, border: 'none',
              background: 'transparent', cursor: 'pointer',
              color: 'rgba(146,162,212,0.4)', fontSize: '0.8rem',
            }}
          >
            <motion.span
              animate={{ rotate: collapsed ? 0 : 180 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'inline-block' }}
            >
              ›
            </motion.span>
          </motion.button>
        </div>
      </motion.aside>

      <div className="a-main-wrap">
        <header className="a-topbar">
          <FpBalance />
          <GGBalance />
        </header>
        <main className="a-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              style={{ height: '100%' }}
            >
              {page === 'products'    && <ProductsPage />}
              {page === 'categories'  && <CategoriesPage />}
              {page === 'markup'      && <MarkupPage />}
              {page === 'wildberries' && <WildberriesPage />}
              {page === 'logs'        && <LogsPage />}
              {page === 'tokens'      && <TokensPage />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
