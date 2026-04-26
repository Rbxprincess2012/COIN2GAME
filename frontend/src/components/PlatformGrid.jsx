import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SERVICE_CONFIG } from '../config/services'

// Russian pluralization word only: 1 → товар, 2-4 → товара, 5+ → товаров
function itemWord(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 19) return 'товаров'
  if (mod10 === 1) return 'товар'
  if (mod10 >= 2 && mod10 <= 4) return 'товара'
  return 'товаров'
}

const FALLBACK_ACCENTS = ['#865fff','#865fff','#865fff','#865fff','#865fff','#865fff']

function getGroupCfg(groupName, idx) {
  const cfg = SERVICE_CONFIG[groupName]
  if (cfg) return cfg
  return {
    accent: FALLBACK_ACCENTS[idx % FALLBACK_ACCENTS.length],
    label: groupName,
  }
}

function MaskLogo({ src, size = 44 }) {
  return (
    <div style={{
      width: size,
      height: size,
      flexShrink: 0,
      backgroundColor: 'rgba(255,255,255,0.75)',
      WebkitMaskImage: `url(${src})`,
      maskImage: `url(${src})`,
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
    }} />
  )
}

function GroupTile({ g, idx, onSelectService }) {
  const cfg = getGroupCfg(g.group, idx)
  return (
    <motion.button
      className="platform-tile"
      style={{ '--ta': cfg.accent }}
      onClick={() => onSelectService(g.group)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: idx * 0.03 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      {cfg.logo
        ? <MaskLogo src={cfg.logo} size={40} />
        : <div style={{ width: 40, height: 40, flexShrink: 0 }} />
      }
      <div className="platform-tile-info">
        <span className="platform-tile-name">{cfg.label || g.group}</span>
        <span className="platform-tile-count">{g.available} {itemWord(g.available)}</span>
      </div>
      <div className="platform-tile-arrow">→</div>
    </motion.button>
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
          <AnimatePresence>
            {showOthers && (
              <motion.div
                className="platform-grid"
                style={{ marginTop: 12 }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                {otherGroups.map((g, idx) => (
                  <GroupTile key={g.group} g={g} idx={mainGroups.length + idx} onSelectService={onSelectService} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </section>
  )
}

export default PlatformGrid
