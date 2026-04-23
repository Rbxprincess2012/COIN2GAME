import { useState, useEffect } from 'react'
import { adminApi } from '../adminApi'

function DescriptionModal({ group, initial, onSave, onClose }) {
  const [text, setText] = useState(initial || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(group, text)
    setSaving(false)
    onClose()
  }

  return (
    <div className="a-backdrop" onClick={onClose}>
      <div className="a-modal" style={{ width: 'min(100%, 560px)' }} onClick={e => e.stopPropagation()}>
        <div className="a-modal-header">
          <h3>Описание категории: {group}</h3>
          <button className="a-close" onClick={onClose}>×</button>
        </div>
        <div className="a-modal-body">
          <p className="a-muted" style={{ fontSize: '0.82rem', marginBottom: 8 }}>
            Это описание будет применено ко всем товарам группы, у которых нет собственного описания — при следующей синхронизации.
          </p>
          <label className="a-field">
            <span>Описание</span>
            <textarea
              rows={8}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Введите описание категории..."
              autoFocus
            />
          </label>
        </div>
        <div className="a-modal-footer">
          <button className="a-btn a-btn--ghost" onClick={onClose}>Отмена</button>
          {text && (
            <button
              className="a-btn a-btn--ghost"
              style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
              onClick={() => { setText(''); }}
            >
              Очистить
            </button>
          )}
          <button className="a-btn a-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const [groups, setGroups] = useState([])
  const [featured, setFeatured] = useState(new Set())
  const [descriptions, setDescriptions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editGroup, setEditGroup] = useState(null)

  useEffect(() => {
    Promise.all([adminApi.getGroups(), adminApi.getSettings()]).then(([rows, s]) => {
      setGroups(rows.map(r => r.group_name))
      try {
        const raw = s.featured_groups
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (Array.isArray(parsed)) setFeatured(new Set(parsed))
      } catch {}
      try {
        const raw = s.group_descriptions
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (parsed && typeof parsed === 'object') setDescriptions(parsed)
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

  async function handleSaveDescription(group, text) {
    const next = { ...descriptions, [group]: text }
    if (!text) delete next[group]
    setDescriptions(next)
    await adminApi.updateSettings({ group_descriptions: JSON.stringify(next) })
  }

  async function handleSave() {
    setSaving(true)
    await adminApi.updateSettings({ featured_groups: JSON.stringify([...featured]) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="a-page"><p className="a-muted">Загрузка...</p></div>

  const otherList = groups.filter(g => !featured.has(g))

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
          {groups.map(g => {
            const hasDesc = !!descriptions[g]
            return (
              <div
                key={g}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: featured.has(g) ? 'rgba(134,95,255,0.08)' : 'transparent',
                  border: featured.has(g) ? '1px solid rgba(134,95,255,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer', minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={featured.has(g)}
                    onChange={() => toggle(g)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#865fff', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.9rem', color: featured.has(g) ? '#e8ecff' : '#92a2d4', flex: 1, minWidth: 0 }}>
                    {g}
                  </span>
                </label>

                {featured.has(g) && (
                  <span className="a-badge a-badge--purple" style={{ flexShrink: 0 }}>Главная</span>
                )}

                <button
                  title={hasDesc ? 'Редактировать описание категории' : 'Добавить описание категории'}
                  onClick={() => setEditGroup(g)}
                  style={{
                    background: hasDesc ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                    border: hasDesc ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    color: hasDesc ? '#4ade80' : '#92a2d4',
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {hasDesc ? '✓ Описание' : '+ Описание'}
                </button>
              </div>
            )
          })}
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

      {editGroup && (
        <DescriptionModal
          group={editGroup}
          initial={descriptions[editGroup]}
          onSave={handleSaveDescription}
          onClose={() => setEditGroup(null)}
        />
      )}
    </div>
  )
}
