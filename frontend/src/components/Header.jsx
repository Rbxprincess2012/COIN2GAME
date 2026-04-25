import { useEffect, useRef, useState } from 'react'

function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#865fff"/>
          <stop offset="100%" stopColor="#f48f1b"/>
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a87fff"/>
          <stop offset="100%" stopColor="#ffb347"/>
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="17" fill="url(#lg1)" opacity="0.18"/>
      <circle cx="18" cy="18" r="17" stroke="url(#lg1)" strokeWidth="1.5" fill="none"/>
      <circle cx="18" cy="18" r="13" fill="url(#lg1)"/>
      <circle cx="18" cy="18" r="10.5" stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none"/>
      <rect x="11" y="16.2" width="14" height="3.6" rx="1.8" fill="white"/>
      <rect x="16.2" y="11" width="3.6" height="14" rx="1.8" fill="white"/>
      <circle cx="11.5" cy="11.5" r="1.4" fill="url(#lg2)" opacity="0.7"/>
      <circle cx="24.5" cy="11.5" r="1.4" fill="url(#lg2)" opacity="0.7"/>
      <circle cx="11.5" cy="24.5" r="1.4" fill="url(#lg2)" opacity="0.7"/>
      <circle cx="24.5" cy="24.5" r="1.4" fill="url(#lg2)" opacity="0.7"/>
    </svg>
  )
}

function UserMenu({ userEmail, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn-user-logged" onClick={() => setOpen(v => !v)}>
        <span className="btn-user-dot" />
        {userEmail.split('@')[0]}
        <span style={{ fontSize: '0.6rem', opacity: 0.6, marginLeft: 2 }}>▾</span>
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-email">{userEmail}</div>
          <button className="user-dropdown-logout" onClick={() => { setOpen(false); onLogout() }}>
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}

function Header({ onLogin, onLogout, onCartOpen, cartCount, isLoggedIn, userEmail, onLogoClick }) {
  return (
    <header className="site-header">
      <div className="header-left">
        <button className="brand-btn" onClick={onLogoClick}>
          <Logo />
          <span className="brand-text">COIN<span className="brand-accent">2</span>GAME</span>
        </button>
        <div className="header-divider" />
        <span className="brand-tagline">Top up. Level up.</span>
      </div>

      <div className="header-right">
        <nav className="site-nav">
          <a href="#platforms" onClick={(e) => { e.preventDefault(); onLogoClick?.() }}>Каталог</a>
          <a href="#how">Как купить</a>
          <a href="#support">Поддержка</a>
        </nav>
        <div className="header-divider" />
        <div className="header-actions">
          <button className="btn-cart" onClick={onCartOpen}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M1 1h2.5l1.6 8h8.4l1.5-5.5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="7.5" cy="15" r="1.2" fill="currentColor"/>
              <circle cx="13" cy="15" r="1.2" fill="currentColor"/>
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          {isLoggedIn
            ? <UserMenu userEmail={userEmail} onLogout={onLogout} />
            : <button className="btn-primary btn-sm" onClick={onLogin}>Войти</button>
          }
        </div>
      </div>
    </header>
  )
}

export default Header
