import { useState, useEffect } from 'react'
import { adminApi } from '../adminApi'

export default function CategoriesPage() {
  const [groups, setGroups] = useState([])
  const [featured, setFeatured] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([adminApi.getGroups(), adminApi.getSettings()]).then(([rows, s]) => {
      setGroups(rows.map(r => r.group_name))
      try {
        const raw = s.featured_groups
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (Array.isArray(parsed)) setFeatured(new Set(parsed))
      } catch {}
      setLoading(false)
    })
  }, [])

  function toggle(group) {
    setFeatured(prev => {
      const next = new Set(prev)
      next.has(group) ? next.delete(group) : next.add(group)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    await adminApi.updateSettings({ featured_groups: JSON.stringify([...featured]) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="a-page"><p className="a-muted">Загрузка...</p></div>

  const featuredList = groups.filter(g => featured.has(g))
  const otherList    = groups.filter(g => !featured.has(g))

  return (
    <div className="a-page">
      <div className="a-page-header">
        <h2>Категории на главной</h2>
        <button className="a-btn a-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем...' : saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      <p className="a-muted" style={{ marginBottom: 24, fontSize: '0.88rem' }}>
        Отмеченные категории показываются на главной странице сразу.
        Остальные скрыты за кнопкой «Другие категории».
        Если ни одна не отмечена — показываются все.
      </p>

      <div className="a-card">
        <h3 className="a-card-title" style={{ marginBottom: 16 }}>
          Показывать на главной <span className="a-count">{featured.size}</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groups.map(g => (
            <label
              key={g}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: featured.has(g) ? 'rgba(134,95,255,0.08)' : 'transparent',
                border: featured.has(g) ? '1px solid rgba(134,95,255,0.2)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={featured.has(g)}
                onChange={() => toggle(g)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#865fff' }}
              />
              <span style={{ flex: 1, fontSize: '0.9rem', color: featured.has(g) ? '#e8ecff' : '#92a2d4' }}>
                {g}
              </span>
              {featured.has(g) && (
                <span className="a-badge a-badge--purple">Главная</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {featured.size > 0 && (
        <div className="a-card" style={{ marginTop: 16 }}>
          <h3 className="a-card-title" style={{ marginBottom: 8 }}>
            Скрыты за «Другие категории» <span className="a-count">{otherList.length}</span>
          </h3>
          <p className="a-muted" style={{ fontSize: '0.82rem' }}>
            {otherList.length === 0
              ? 'Все категории показываются на главной'
              : otherList.join(' · ')}
          </p>
        </div>
      )}
    </div>
  )
}
