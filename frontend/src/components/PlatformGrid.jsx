import { SERVICE_CONFIG, SERVICE_ORDER } from '../config/services'
import products from '../data/products'

function PlatformGrid({ onSelectService, searchQuery = '' }) {
  const countByService = {}
  for (const p of products) {
    countByService[p.service] = (countByService[p.service] || 0) + 1
  }

  const q = searchQuery.trim().toLowerCase()
  const visible = SERVICE_ORDER.filter((key) => {
    if (!q) return true
    const cfg = SERVICE_CONFIG[key]
    return cfg?.label.toLowerCase().includes(q) || key.toLowerCase().includes(q)
  })

  return (
    <section className="platform-grid-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Платформы</p>
          <h2>Выберите сервис</h2>
        </div>
      </div>
      <div className="platform-grid">
        {visible.map((key) => {
          const cfg = SERVICE_CONFIG[key]
          if (!cfg) return null
          const count = countByService[key] || 0
          return (
            <button
              key={key}
              className="platform-tile"
              style={{ background: cfg.bg }}
              onClick={() => onSelectService(key)}
            >
              <div className="platform-tile-img-wrap">
                <img
                  src={cfg.image}
                  alt={cfg.label}
                  className="platform-tile-img"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
              <div className="platform-tile-info">
                <span className="platform-tile-name" style={{ color: cfg.accent }}>{cfg.label}</span>
                <span className="platform-tile-count">{count} товаров</span>
              </div>
              <div className="platform-tile-arrow">→</div>
            </button>
          )
        })}
        {visible.length === 0 && (
          <p className="empty-state" style={{ gridColumn: '1/-1' }}>Ничего не найдено</p>
        )}
      </div>
    </section>
  )
}

export default PlatformGrid
