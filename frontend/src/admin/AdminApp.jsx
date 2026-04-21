import { useState } from 'react'
import { getToken, saveToken, clearToken } from './adminApi'
import ProductsPage from './pages/ProductsPage'
import MarkupPage from './pages/MarkupPage'
import LogsPage from './pages/LogsPage'
import TokensPage from './pages/TokensPage'
import WildberriesPage from './pages/WildberriesPage'
import './admin.css'

const NAV = [
  { key: 'products',     label: '📦 Товары' },
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
      const res = await fetch('/api/admin/settings', {
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
          onClick={() => { clearToken(); setAuthed(false) }}
        >
          Выйти
        </button>
      </aside>

      <main className="a-main">
        {page === 'products'    && <ProductsPage />}
        {page === 'markup'      && <MarkupPage />}
        {page === 'wildberries' && <WildberriesPage />}
        {page === 'logs'        && <LogsPage />}
        {page === 'tokens'      && <TokensPage />}
      </main>
    </div>
  )
}
