import { useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import ProductCard from './components/ProductCard'
import ProductDetails from './components/ProductDetails'
import LoginModal from './components/LoginModal'
import CartPanel from './components/CartPanel'
import CheckoutModal from './components/CheckoutModal'
import Footer from './components/Footer'
import PlatformGrid from './components/PlatformGrid'
import PlatformPage from './components/PlatformPage'
import GamesSection from './components/GamesSection'
import GameDetails from './components/GameDetails'
import ScrollToTop from './components/ScrollToTop'
import { api } from './api'
import { API_BASE } from './config.js'
import { fixLayout } from './utils/layoutFix.js'

function App() {
  // view: 'home' | 'platform' | 'product' | 'game'
  const [view, setView] = useState('home')
  const [selectedGame, setSelectedGame] = useState(null)
  const [activePlatform, setActivePlatform] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const [cart, setCart] = useState([])
  const [loginVisible, setLoginVisible] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutItems, setCheckoutItems] = useState([])
  const [homeSearch, setHomeSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [fixedQuery, setFixedQuery] = useState(null)
  const searchRef = useRef(null)
  const [productTypeMap, setProductTypeMap] = useState({})
  const [groups, setGroups] = useState([])
  const [featured, setFeatured] = useState([])
  const [platformProducts, setPlatformProducts] = useState([])
  const [platformLoading, setPlatformLoading] = useState(false)

  useEffect(() => {
    const storedCart = localStorage.getItem('topup_cart')
    const storedEmail = localStorage.getItem('topup_email')
    const storedLoggedIn = localStorage.getItem('topup_logged_in')
    if (storedCart) setCart(JSON.parse(storedCart))
    if (storedEmail) setUserEmail(storedEmail)
    if (storedLoggedIn === 'true') setIsLoggedIn(true)

    // Load product types (TOPUP / VOUCHER)
    api.fpProducts().then(data => {
      if (Array.isArray(data)) {
        const map = {}
        for (const p of data) map[String(p.product_id)] = p.type
        setProductTypeMap(map)
      }
    }).catch(() => {})

    // Load groups
    fetch(API_BASE + '/api/groups').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setGroups(data)
    }).catch(() => {})

    // Load featured (cheapest in-stock per group, prefer Russia)
    fetch(API_BASE + '/api/products?in_stock=true').then(r => r.json()).then(({ products }) => {
      if (!Array.isArray(products)) return
      const byGroup = {}
      for (const p of products) {
        if (!byGroup[p.service]) byGroup[p.service] = []
        byGroup[p.service].push(p)
      }
      const BADGES = ['Хит продаж', 'Хит продаж', 'Хит продаж', 'Популярный', 'Популярный', 'Популярный', 'Выгодно', 'Выгодно', 'Выгодно']
      const picks = Object.values(byGroup).map(list => {
        const ru = list.filter(p => p.region === 'Россия' && p.price >= 500)
        const pool = ru.length ? ru : list.filter(p => p.price >= 500)
        if (!pool.length) return null
        return pool.reduce((a, b) => a.price <= b.price ? a : b)
      }).filter(Boolean).slice(0, 9)
      setFeatured(picks.map((p, i) => ({ ...p, badge: BADGES[i] || 'Популярный' })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const raw = homeSearch.trim()
    if (!raw) { setSuggestions([]); setFixedQuery(null); return }

    const { fixed, wasFixed } = fixLayout(raw)
    setFixedQuery(wasFixed ? fixed : null)
    setSearchLoading(true)

    const timer = setTimeout(async () => {
      try {
        const primary = encodeURIComponent(raw)
        const alt     = wasFixed ? `&search_alt=${encodeURIComponent(fixed)}` : ''
        const res = await fetch(`${API_BASE}/api/products?search=${primary}${alt}&in_stock=true`)
        const { products = [] } = await res.json()
        setSuggestions(products.slice(0, 10))
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
      setSearchLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [homeSearch])

  useEffect(() => { localStorage.setItem('topup_cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => {
    localStorage.setItem('topup_email', userEmail)
    localStorage.setItem('topup_logged_in', String(isLoggedIn))
  }, [userEmail, isLoggedIn])

  const cartCount = useMemo(() => cart.length, [cart])

  const handleSendCode = async (email) => {
    const res = await fetch(API_BASE + '/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (res.ok) {
      setUserEmail(email)
      setCodeSent(true)
      console.log('Код:', data.code)
    }
  }

  const handleVerifyCode = (code) => {
    if (code.length === 4) {
      setIsLoggedIn(true)
      setLoginVisible(false)
      setCodeSent(false)
    }
  }

  const handleAddToCart = (product) => {
    setCart((prev) => [...prev, { ...product, cartKey: `${product.id}-${Date.now()}` }])
    setShowCart(true)
  }

  const handleRemoveFromCart = (cartKey) => {
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey))
  }

  const openCheckout = (items) => {
    setCheckoutItems(items)
    setShowCart(false)
    setShowCheckout(true)
  }

  const handleCheckoutClose = () => {
    setShowCheckout(false)
    setCart([])
    setCheckoutItems([])
    setSelectedProduct(null)
    setView(activePlatform ? 'platform' : selectedGame ? 'game' : 'home')
  }

  const goHome = () => { setView('home'); setActivePlatform(null); setSelectedProduct(null); setSelectedGame(null) }

  const goToGame = (game) => {
    setSelectedGame(game)
    setView('game')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBackFromGame = () => {
    setSelectedGame(null)
    setView('home')
  }

  const goToPlatform = async (service) => {
    setActivePlatform(service)
    setSelectedProduct(null)
    setView('platform')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setPlatformLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/products?group=${encodeURIComponent(service)}&in_stock=true`)
      const { products } = await res.json()
      setPlatformProducts(products || [])
    } catch { setPlatformProducts([]) }
    setPlatformLoading(false)
  }

  const goToProduct = (product) => {
    setSelectedProduct(product)
    setView('product')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBackFromProduct = () => {
    setSelectedProduct(null)
    setView(activePlatform ? 'platform' : 'home')
  }

  return (
    <div className="app-shell">
      <Header
        onLogin={() => setLoginVisible(true)}
        onCartOpen={() => setShowCart(true)}
        cartCount={cartCount}
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        onLogoClick={goHome}
      />

      <main className="page-main">

        {/* ── Home ────────────────────────────────────────────────── */}
        {view === 'home' && (
          <>
            <div className="home-search-bar">
              <div className="search-wrap" ref={searchRef} style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="search-input search-input--home"
                  placeholder="Найти игру, сервис или платформу..."
                  value={homeSearch}
                  onChange={e => { setHomeSearch(e.target.value); setShowSuggestions(true) }}
                  onFocus={() => suggestions.length && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  autoComplete="off"
                />
                {homeSearch && (
                  <button className="search-clear" onClick={() => { setHomeSearch(''); setSuggestions([]); setFixedQuery(null) }}>×</button>
                )}

                {/* Suggestion dropdown */}
                {showSuggestions && homeSearch.trim() && (
                  <div className="search-suggestions">
                    {fixedQuery && (
                      <div className="search-suggestions-hint">
                        Раскладка исправлена: <b>{fixedQuery}</b>
                      </div>
                    )}
                    {searchLoading && <div className="search-suggestions-loading">Поиск...</div>}
                    {!searchLoading && suggestions.length === 0 && (
                      <div className="search-suggestions-empty">Ничего не найдено</div>
                    )}
                    {suggestions.map(p => (
                      <button
                        key={p.id}
                        className="search-suggestion-item"
                        onMouseDown={() => { goToProduct(p); setHomeSearch(''); setShowSuggestions(false) }}
                      >
                        <span className="search-suggestion-name">{p.title}</span>
                        <span className="search-suggestion-meta">{p.platform} · {p.region}</span>
                        <span className="search-suggestion-price">₽{p.price.toLocaleString('ru-RU')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div id="platforms">
              <PlatformGrid onSelectService={goToPlatform} searchQuery={homeSearch} groups={groups} />
            </div>

            {featured.length > 0 && (
              <section className="featured-section">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Хиты продаж</p>
                    <h2>Самые популярные</h2>
                  </div>
                </div>
                <div className="products-grid">
                  {featured.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={() => goToProduct(product)}
                      onAdd={() => handleAddToCart(product)}
                      showBadge
                    />
                  ))}
                </div>
              </section>
            )}

            <GamesSection onSelectGame={goToGame} />
          </>
        )}

        {/* ── Game detail ──────────────────────────────────────────── */}
        {view === 'game' && selectedGame && (
          <GameDetails
            game={selectedGame}
            onBack={goBackFromGame}
            onAddToCart={handleAddToCart}
            onCheckout={(game) => openCheckout([game])}
          />
        )}

        {/* ── Platform page ────────────────────────────────────────── */}
        {view === 'platform' && activePlatform && (
          <PlatformPage
            service={activePlatform}
            groupMeta={groups.find(g => g.group === activePlatform)}
            products={platformProducts}
            loading={platformLoading}
            onBack={goHome}
            onSelect={goToProduct}
            onAdd={handleAddToCart}
          />
        )}

        {/* ── Product detail ───────────────────────────────────────── */}
        {view === 'product' && selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            onBack={goBackFromProduct}
            onAddToCart={handleAddToCart}
            onCheckout={() => openCheckout([selectedProduct])}
            userEmail={userEmail}
            isLoggedIn={isLoggedIn}
          />
        )}

      </main>

      <Footer />
      <ScrollToTop />

      <LoginModal
        visible={loginVisible}
        initialEmail={userEmail}
        onClose={() => setLoginVisible(false)}
        onSendCode={handleSendCode}
        onVerifyCode={handleVerifyCode}
        codeSent={codeSent}
      />

      <CartPanel
        visible={showCart}
        cart={cart}
        onClose={() => setShowCart(false)}
        onRemove={handleRemoveFromCart}
        onCheckout={() => openCheckout(cart)}
      />

      <CheckoutModal
        visible={showCheckout}
        items={checkoutItems}
        userEmail={userEmail}
        isLoggedIn={isLoggedIn}
        onClose={handleCheckoutClose}
        onLogin={() => { setShowCheckout(false); setLoginVisible(true) }}
        productTypeMap={productTypeMap}
      />
    </div>
  )
}

export default App
