import { useMemo, useState } from 'react'
import { SERVICE_CONFIG, getFlagUrl } from '../config/services'
import ProductCard from './ProductCard'
import products from '../data/products'

function FlagImg({ region }) {
  const url = getFlagUrl(region)
  if (!url) return <span className="region-tab-flag-fallback">🌍</span>
  return (
    <img
      src={url}
      alt={region}
      className="region-tab-flag-img"
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}

function PlatformPage({ service, onBack, onSelect, onAdd }) {
  const cfg = SERVICE_CONFIG[service] || {}
  const serviceProducts = useMemo(
    () => products.filter((p) => p.service === service),
    [service]
  )

  const regions = useMemo(() => {
    const set = new Set(serviceProducts.map((p) => p.region))
    return ['Все', ...Array.from(set)]
  }, [serviceProducts])

  const [activeRegion, setActiveRegion] = useState('Все')

  const filtered = useMemo(() => {
    if (activeRegion === 'Все') return serviceProducts
    return serviceProducts.filter((p) => p.region === activeRegion)
  }, [serviceProducts, activeRegion])

  return (
    <section className="platform-page">
      <div className="platform-page-hero" style={{ background: cfg.bg }}>
        <button className="btn-tertiary back-btn" onClick={onBack}>← Назад</button>
        <div className="platform-page-hero-inner">
          <img
            src={cfg.image}
            alt={cfg.label}
            className="platform-page-hero-img"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div>
            <h1 className="platform-page-title" style={{ color: cfg.accent }}>
              {cfg.label || service}
            </h1>
            <p className="platform-page-subtitle">{serviceProducts.length} товаров · мгновенная доставка кода</p>
          </div>
        </div>
      </div>

      <div className="platform-page-body">
        <div className="region-filter-row">
          {regions.map((region) => (
            <button
              key={region}
              className={`region-tab${activeRegion === region ? ' active' : ''}`}
              onClick={() => setActiveRegion(region)}
            >
              {region === 'Все'
                ? <span className="region-tab-flag-fallback">🌐</span>
                : <FlagImg region={region} />
              }
              <span>{region}</span>
            </button>
          ))}
        </div>

        <div className="products-grid">
          {filtered.length ? (
            filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={() => onSelect(product)}
                onAdd={() => onAdd(product)}
              />
            ))
          ) : (
            <div className="empty-state">Нет товаров для выбранного региона.</div>
          )}
        </div>
      </div>
    </section>
  )
}

export default PlatformPage
