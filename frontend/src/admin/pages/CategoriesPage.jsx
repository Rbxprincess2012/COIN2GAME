import { useState, useEffect } from 'react'
import { adminApi } from '../adminApi'

// Generic modal for description or instructions
function TextModal({ group, fieldLabel, initial, onSave, onClose, loadDraft }) {
  const [text, setText] = useState(initial || '')
  const [saving, setSaving] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)

  useEffect(() => {
    if (initial || !loadDraft) return
    setLoadingDraft(true)
    loadDraft(group).then(value => {
      if (value) { setText(value); setDraftLoaded(true) }
      setLoadingDraft(false)
    }).catch(() => setLoadingDraft(false))
  }, [group, initial, loadDraft])

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
          <h3>{fieldLabel}: {group}</h3>
          <button className="a-close" onClick={onClose}>×</button>
        </div>
        <div className="a-modal-body">
          {draftLoaded && (
            <div className="a-alert a-alert--success" style={{ marginBottom: 12, fontSize: '0.8rem' }}>
              Загружен черновик из существующих товаров — отредактируйте и сохраните.
            </div>
          )}
          <p className="a-muted" style={{ fontSize: '0.82rem', marginBottom: 8 }}>
            {fieldLabel === 'Описание'
              ? 'Будет применено ко всем товарам группы без собственного описания при следующей синхронизации.'
              : 'Инструкция «Как получить товар» — показывается покупателям после оплаты и отправляется в email.'}
          </p>
          <label className="a-field">
            <span>{fieldLabel}</span>
            <textarea
              rows={8}
              value={loadingDraft ? 'Загрузка...' : text}
              onChange={e => setText(e.target.value)}
              placeholder={`Введите ${fieldLabel.toLowerCase()}...`}
              disabled={loadingDraft}
              autoFocus={!loadingDraft}
            />
          </label>
        </div>
        <div className="a-modal-footer">
          <button className="a-btn a-btn--ghost" onClick={onClose}>Отмена</button>
          {text && (
            <button
              className="a-btn a-btn--ghost"
              style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
              onClick={() => setText('')}
            >
              Очистить
            </button>
          )}
          <button className="a-btn a-btn--primary" onClick={handleSave} disabled={saving || loadingDraft}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { key: 'all',      label: 'Все' },
  { key: 'featured', label: 'На главной' },
  { key: 'other',    label: 'Прочие' },
]

export default function CategoriesPage() {
  const [groups, setGroups]           = useState([])
  const [featured, setFeatured]       = useState(new Set())
  const [descriptions, setDescriptions]   = useState({})
  const [instructions, setInstructions]   = useState({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  // modal: { group, field: 'desc'|'instr' }
  const [editModal, setEditModal]     = useState(null)
  const [tab, setTab]                 = useState('all')
  const [search, setSearch]           = useState('')
  const [descFilter, setDescFilter]   = useState('')
  const [instrFilter, setInstrFilter] = useState('')

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
      try {
        const raw = s.group_instructions
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (parsed && typeof parsed === 'object') setInstructions(parsed)
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

  async function handleSaveInstruction(group, text) {
    const next = { ...instructions, [group]: text }
    if (!text) delete next[group]
    setInstructions(next)
    await adminApi.updateSettings({ group_instructions: JSON.stringify(next) })
  }

  async function handleSave() {
    setSaving(true)
    await adminApi.updateSettings({ featured_groups: JSON.stringify([...featured]) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="a-page"><p className="a-muted">Загрузка...</p></div>

  const visible = groups.filter(g => {
    if (tab === 'featured' && !featured.has(g)) return false
    if (tab === 'other'    &&  featured.has(g)) return false
    if (search && !g.toLowerCase().includes(search.toLowerCase())) return false
    if (descFilter === 'with'    && !descriptions[g]) return false
    if (descFilter === 'without' &&  descriptions[g]) return false
    if (instrFilter === 'with'    && !instructions[g]) return false
    if (instrFilter === 'without' &&  instructions[g]) return false
    return true
  })

  return (
    <div className="a-page">
      <div className="a-page-header">
        <h2>Категории <span className="a-count">{groups.length}</span></h2>
        <button className="a-btn a-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем...' : saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      {/* ── Фильтры ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, gap: 2 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: tab === t.key ? 'rgba(134,95,255,0.25)' : 'none',
                border: 'none', borderRadius: 8, padding: '5px 14px',
                cursor: 'pointer', color: tab === t.key ? '#c4acff' : '#92a2d4',
                fontSize: '0.82rem', fontFamily: 'inherit', fontWeight: tab === t.key ? 600 : 400,
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
              {t.key === 'featured' && <span style={{ marginLeft: 5, opacity: 0.7 }}>{featured.size}</span>}
              {t.key === 'other'    && <span style={{ marginLeft: 5, opacity: 0.7 }}>{groups.length - featured.size}</span>}
            </button>
          ))}
        </div>

        <input
          className="a-col-filter"
          style={{ flex: '1 1 160px', minWidth: 120, maxWidth: 260 }}
          placeholder="Поиск категории..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select className="a-col-filter" style={{ minWidth: 150 }} value={descFilter} onChange={e => setDescFilter(e.target.value)}>
          <option value="">Все описания</option>
          <option value="with">С описанием</option>
          <option value="without">Без описания</option>
        </select>

        <select className="a-col-filter" style={{ minWidth: 160 }} value={instrFilter} onChange={e => setInstrFilter(e.target.value)}>
          <option value="">Все инструкции</option>
          <option value="with">С инструкцией</option>
          <option value="without">Без инструкции</option>
        </select>
      </div>

      {/* ── Список ── */}
      <div className="a-card">
        {visible.length === 0 && (
          <p className="a-muted" style={{ fontSize: '0.85rem', padding: '8px 0' }}>Ничего не найдено</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visible.map(g => {
            const hasDesc  = !!descriptions[g]
            const hasInstr = !!instructions[g]
            const isFeatured = featured.has(g)
            return (
              <div
                key={g}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10,
                  background: isFeatured ? 'rgba(134,95,255,0.08)' : 'transparent',
                  border: isFeatured ? '1px solid rgba(134,95,255,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={() => toggle(g)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#865fff', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.88rem', color: isFeatured ? '#e8ecff' : '#92a2d4', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g}
                  </span>
                </label>

                {isFeatured
                  ? <span className="a-badge a-badge--purple" style={{ flexShrink: 0 }}>Главная</span>
                  : <span className="a-badge" style={{ flexShrink: 0, background: 'rgba(255,255,255,0.05)', color: 'rgba(232,236,255,0.3)' }}>Прочие</span>
                }

                {/* Кнопка Описание */}
                <button
                  title={hasDesc ? 'Редактировать описание' : 'Добавить описание'}
                  onClick={() => setEditModal({ group: g, field: 'desc' })}
                  style={{
                    background: hasDesc ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                    border: hasDesc ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                    color: hasDesc ? '#4ade80' : '#92a2d4',
                    fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {hasDesc ? '✓ Описание' : '+ Описание'}
                </button>

                {/* Кнопка Инструкция */}
                <button
                  title={hasInstr ? 'Редактировать инструкцию' : 'Добавить инструкцию'}
                  onClick={() => setEditModal({ group: g, field: 'instr' })}
                  style={{
                    background: hasInstr ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)',
                    border: hasInstr ? '1px solid rgba(96,165,250,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                    color: hasInstr ? '#60a5fa' : '#92a2d4',
                    fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {hasInstr ? '✓ Инструкция' : '+ Инструкция'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {editModal?.field === 'desc' && (
        <TextModal
          group={editModal.group}
          fieldLabel="Описание"
          initial={descriptions[editModal.group]}
          onSave={handleSaveDescription}
          onClose={() => setEditModal(null)}
          loadDraft={g => adminApi.getGroupDescription(g).then(r => r.description)}
        />
      )}

      {editModal?.field === 'instr' && (
        <TextModal
          group={editModal.group}
          fieldLabel="Инструкция"
          initial={instructions[editModal.group]}
          onSave={handleSaveInstruction}
          onClose={() => setEditModal(null)}
          loadDraft={null}
        />
      )}
    </div>
  )
}
