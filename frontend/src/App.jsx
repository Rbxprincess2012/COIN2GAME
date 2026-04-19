import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header'
import ProductCard from './components/ProductCard'
import ProductDetails from './components/ProductDetails'
import LoginModal from './components/LoginModal'
import CartPanel from './components/CartPanel'
import CheckoutModal from './components/CheckoutModal'
import Footer from './components/Footer'
import PlatformGrid from './components/PlatformGrid'
import PlatformPage from './components/PlatformPage'
import products from './data/products'
import { SERVICE_ORDER } from './config/services'
import { api } from './api'

// Pick one featured product per service: prefer Russia, then cheapest ≥ 500
function pickFeatured() {
  const byService = {}
  for (const p of products) {
    if (!byService[p.service]) byService[p.service] = []
    byService[p.service].push(p)
  }
  return SERVICE_ORDER.map((svc) => {
    const list = byService[svc] || []
    const ru = list.filter((p) => p.region === 'Россия' && p.price >= 500)
    const pool = ru.length ? ru : list.filter((p) => p.price >= 500)
    if (!pool.length) return null
    return pool.reduce((a, b) => (a.price <= b.price ? a : b))
  }).filter(Boolean)
}

const FEATURED = pickFeatured()

function App() {
  // view: 'home' | 'platform' | 'product'
  const [view, setView] = useState('home')
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
  // productTypeMap: { [product_id: string]: 'TOPUP' | 'VOUCHER' }
  const [productTypeMap, setProductTypeMap] = useState({})

  useEffect(() => {
    const storedCart = localStorage.getItem('topup_cart')
    const storedEmail = localStorage.getItem('topup_email')
    const storedLoggedIn = localStorage.getItem('topup_logged_in')
    if (storedCart) setCart(JSON.parse(storedCart))
    if (storedEmail) setUserEmail(storedEmail)
    if (storedLoggedIn === 'true') setIsLoggedIn(true)

    // Load product types from API (TOPUP / VOUCHER)
    api.fpProducts().then(data => {
      if (Array.isArray(data)) {
        const map = {}
        for (const p of data) map[String(p.product_id)] = p.type
        setProductTypeMap(map)
      }
    }).catch(() => {}) // silent — falls back to 'VOUCHER' default
  }, [])

  useEffect(() => { localStorage.setItem('topup_cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => {
    localStorage.setItem('topup_email', userEmail)
    localStorage.setItem('topup_logged_in', String(isLoggedIn))
  }, [userEmail, isLoggedIn])

  const cartCount = useMemo(() => cart.length, [cart])

  const handleSendCode = async (email) => {
    const res = await fetch('/api/auth/send-code', {
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
    setView(activePlatform ? 'platform' : 'home')
  }

  const goHome = () => { setView('home'); setActivePlatform(null); setSelectedProduct(null) }

  const goToPlatform = (service) => {
    setActivePlatform(service)
    setSelectedProduct(null)
    setView('platform')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
            <section className="hero-card hero-card--full">
              <h1>Цифровые пополнения и подписки для геймеров</h1>
              <p>Быстрая покупка валюты и ваучеров с мгновенной доставкой на экран и email.</p>
            </section>

            <div className="home-search-bar">
              <input
                type="text"
                className="search-input search-input--home"
                placeholder="Найти игру, сервис или платформу..."
                value={homeSearch}
                onChange={(e) => setHomeSearch(e.target.value)}
              />
            </div>

            <div id="platforms">
              <PlatformGrid onSelectService={goToPlatform} searchQuery={homeSearch} />
            </div>

            {/* Featured products */}
            <section className="featured-section">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Хиты продаж</p>
                  <h2>Самые популярные</h2>
                </div>
              </div>
              <div className="products-grid">
                {FEATURED.map((product) => (
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
          </>
        )}

        {/* ── Platform page ────────────────────────────────────────── */}
        {view === 'platform' && activePlatform && (
          <PlatformPage
            service={activePlatform}
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
