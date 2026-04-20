import { SERVICE_CONFIG } from '../config/services'

// Fallback colors for groups not in SERVICE_CONFIG
const FALLBACK_ACCENTS = ['#66c0f4','#ff4655','#52b043','#f2a900','#44d62c','#a2aaad','#c8a95a','#0070d1','#ff4444']

function getGroupCfg(groupName, idx) {
  const cfg = SERVICE_CONFIG[groupName]
  if (cfg) return cfg
  return {
    accent: FALLBACK_ACCENTS[idx % FALLBACK_ACCENTS.length],
    bg: 'linear-gradient(135deg, #0d1824 0%, #1b2838 100%)',
    image: null,
    label: groupName,
  }
}

function PlatformGrid({ onSelectService, searchQuery = '', groups = [] }) {
  const q = searchQuery.trim().toLowerCase()
  const visible = groups.filter(g =>
    !q || g.group.toLowerCase().includes(q)
  )

  if (groups.length === 0) {
    return (
      <section className="platform-grid-section">
        <div className="section-header">
          <div><p className="eyebrow">Платформы</p><h2>Выберите сервис</h2></div>
        </div>
        <div className="platform-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="platform-tile platform-tile--skeleton" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="platform-grid-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Платформы</p>
          <h2>Выберите сервис</h2>
        </div>
      </div>
      <div className="platform-grid">
        {visible.map((g, idx) => {
          const cfg = getGroupCfg(g.group, idx)
          const imgSrc = cfg.image || g.icon || null
          return (
            <button
              key={g.group}
              className="platform-tile"
              style={{ background: cfg.bg }}
              onClick={() => onSelectService(g.group)}
            >
              <div className="platform-tile-img-wrap">
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={g.group}
                    className="platform-tile-img"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                )}
              </div>
              <div className="platform-tile-info">
                <span className="platform-tile-name" style={{ color: cfg.accent }}>
                  {cfg.label || g.group}
                </span>
                <span className="platform-tile-count">{g.available} товаров</span>
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
