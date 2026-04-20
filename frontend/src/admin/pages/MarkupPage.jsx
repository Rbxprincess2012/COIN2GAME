import { useState, useEffect } from 'react'
import { adminApi } from '../adminApi'

const GROUPS = ['APPLE ID', 'Nintendo', 'Playstation', 'Xbox', 'Steam',
  'Valorant', 'PUBG Mobile', 'PUBG Battleground', 'Razer Gold']

export default function MarkupPage() {
  const [global, setGlobal] = useState('')
  const [perGroup, setPerGroup] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminApi.getSettings().then(s => {
      setGlobal(s.markup_global ?? 0)
      const pg = {}
      for (const g of GROUPS) {
        const key = `markup_${g.toLowerCase().replace(/\s+/g, '_')}`
        pg[g] = s[key] ?? ''
      }
      setPerGroup(pg)
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const body = { markup_global: Number(global) }
    for (const g of GROUPS) {
      const key = `markup_${g.toLowerCase().replace(/\s+/g, '_')}`
      body[key] = perGroup[g] !== '' ? Number(perGroup[g]) : null
    }
    await adminApi.updateSettings(body)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="a-page"><p className="a-muted">Загрузка...</p></div>

  return (
    <div className="a-page">
      <div className="a-page-header">
        <h2>Настройка наценки</h2>
        <button className="a-btn a-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем...' : saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="a-card">
        <h3 className="a-card-title">Глобальная наценка</h3>
        <p className="a-muted">Применяется ко всем товарам, у которых не задана отдельная наценка.</p>
        <div className="a-markup-row">
          <label className="a-field a-field--inline">
            <span>Наценка %</span>
            <input
              type="number"
              min="0"
              max="100"
              className="a-input a-input--sm"
              value={global}
              onChange={e => setGlobal(e.target.value)}
            />
          </label>
          <div className="a-markup-preview">
            Пример: ₽1 000 → ₽{Math.round(1000 * (1 + Number(global) / 100)).toLocaleString('ru-RU')}
          </div>
        </div>
      </div>

      <div className="a-card">
        <h3 className="a-card-title">Наценка по группам</h3>
        <p className="a-muted">Если поле пустое — используется глобальная наценка.</p>
        <div className="a-markup-grid">
          {GROUPS.map(g => {
            const val = perGroup[g]
            const effective = val !== '' ? Number(val) : Number(global)
            return (
              <div key={g} className="a-markup-item">
                <span className="a-markup-group">{g}</span>
                <label className="a-field a-field--inline">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="a-input a-input--sm"
                    placeholder={`${global}% (глоб.)`}
                    value={val}
                    onChange={e => setPerGroup(p => ({ ...p, [g]: e.target.value }))}
                  />
                  <span className="a-muted">%</span>
                </label>
                <span className="a-markup-result">
                  ₽1 000 → ₽{Math.round(1000 * (1 + effective / 100)).toLocaleString('ru-RU')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
