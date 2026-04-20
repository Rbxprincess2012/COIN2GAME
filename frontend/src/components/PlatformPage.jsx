import { useMemo, useState } from 'react'
import { SERVICE_CONFIG, getFlagUrl } from '../config/services'
import ProductCard from './ProductCard'

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

function PlatformPage({ service, groupMeta, products = [], loading, onBack, onSelect, onAdd }) {
  const cfg = SERVICE_CONFIG[service] || {
    label: service,
    image: groupMeta?.icon || null,
    accent: '#865fff',
    bg: 'linear-gradient(135deg, #0d1824 0%, #1b2838 100%)',
  }

  const regions = useMemo(() => {
    const set = new Set(products.map(p => p.region).filter(Boolean))
    return ['Все', ...Array.from(set)]
  }, [products])

  const [activeRegion, setActiveRegion] = useState('Все')

  const filtered = useMemo(() => {
    if (activeRegion === 'Все') return products
    return products.filter(p => p.region === activeRegion)
  }, [products, activeRegion])

  return (
    <section className="platform-page">
      <div className="platform-page-hero" style={{ background: cfg.bg }}>
        <button className="btn-tertiary back-btn" onClick={onBack}>← Назад</button>
        <div className="platform-page-hero-inner">
          {cfg.image && (
            <img
              src={cfg.image}
              alt={cfg.label}
              className="platform-page-hero-img"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}
          <div>
            <h1 className="platform-page-title" style={{ color: cfg.accent }}>
              {cfg.label}
            </h1>
            <p className="platform-page-subtitle">
              {loading ? 'Загрузка...' : `${products.length} товаров · мгновенная доставка кода`}
            </p>
          </div>
        </div>
      </div>

      <div className="platform-page-body">
        {regions.length > 2 && (
          <div className="region-filter-row">
            {regions.map(region => (
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
        )}

        <div className="products-grid">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="card product-card product-card--skeleton" />
            ))
          ) : filtered.length ? (
            filtered.map(product => (
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
