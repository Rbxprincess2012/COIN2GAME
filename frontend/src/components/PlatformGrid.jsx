import { useState } from 'react'
import { SERVICE_CONFIG } from '../config/services'

const FALLBACK_ACCENTS = ['#66c0f4','#a855f7','#52b043','#f59e0b','#44d62c','#a2aaad','#c8a95a','#0070d1','#f87171']

function getGroupCfg(groupName, idx) {
  const cfg = SERVICE_CONFIG[groupName]
  if (cfg) return cfg
  return {
    accent: FALLBACK_ACCENTS[idx % FALLBACK_ACCENTS.length],
    bg: 'linear-gradient(135deg, #0d1824 0%, #1b2838 100%)',
    label: groupName,
  }
}

function MaskLogo({ src, color, size = 44 }) {
  return (
    <div style={{
      width: size,
      height: size,
      flexShrink: 0,
      backgroundColor: color,
      WebkitMaskImage: `url(${src})`,
      maskImage: `url(${src})`,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
    }} />
  )
}

function GroupTile({ g, idx, onSelectService }) {
  const cfg = getGroupCfg(g.group, idx)
  return (
    <button
      className="platform-tile"
      style={{ background: cfg.bg }}
      onClick={() => onSelectService(g.group)}
    >
      {cfg.logo && <MaskLogo src={cfg.logo} color={cfg.accent} size={44} />}
      <div className="platform-tile-info">
        <span className="platform-tile-name" style={{ color: cfg.accent }}>
          {cfg.label || g.group}
        </span>
        <span className="platform-tile-count">{g.available} товаров</span>
      </div>
      <div className="platform-tile-arrow">→</div>
    </button>
  )
}

function PlatformGrid({ onSelectService, searchQuery = '', groups = [] }) {
  const [showOthers, setShowOthers] = useState(false)

  const q = searchQuery.trim().toLowerCase()
  const hasFeatured = groups.some(g => g.featured)
  const filtered = groups.filter(g => !q || g.group.toLowerCase().includes(q))
  const mainGroups  = q || !hasFeatured ? filtered : filtered.filter(g => g.featured)
  const otherGroups = q || !hasFeatured ? []        : filtered.filter(g => !g.featured)

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
        <div><p className="eyebrow">Платформы</p><h2>Выберите сервис</h2></div>
      </div>

      <div className="platform-grid">
        {mainGroups.map((g, idx) => (
          <GroupTile key={g.group} g={g} idx={idx} onSelectService={onSelectService} />
        ))}
        {mainGroups.length === 0 && (
          <p className="empty-state" style={{ gridColumn: '1/-1' }}>Ничего не найдено</p>
        )}
      </div>

      {otherGroups.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 4px' }}>
            <button className="platform-more-btn" onClick={() => setShowOthers(v => !v)}>
              <span>{showOthers ? '↑ Свернуть' : `Все категории (${otherGroups.length} ещё)`}</span>
            </button>
          </div>
          {showOthers && (
            <div className="platform-grid" style={{ marginTop: 12 }}>
              {otherGroups.map((g, idx) => (
                <GroupTile key={g.group} g={g} idx={mainGroups.length + idx} onSelectService={onSelectService} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default PlatformGrid
