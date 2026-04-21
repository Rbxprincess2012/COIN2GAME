import { useState, useEffect } from 'react'
import { adminApi } from '../adminApi'

const GROUPS = ['APPLE ID', 'Nintendo', 'Playstation', 'Xbox', 'Steam',
  'Valorant', 'PUBG Mobile', 'PUBG Battleground', 'Razer Gold']

const RELEVANT_SUBJECTS = ['Подписки игровых сервисов', 'Диски с играми']

function sellPrice(cost, margin, deductionsPct) {
  const d = deductionsPct / 100
  if (d >= 1) return null
  return Math.ceil(cost * (1 + margin / 100) / (1 - d))
}

const WB_ENTREPRENEURS = [
  { key: 'marina',  label: 'Марина', taxSystem: 'АУСН', taxRate: 8 },
  { key: 'tatyana', label: 'Татьяна', taxSystem: 'УСН',  taxRate: 6 },
]

function ChannelCalc({ margin, cpCommission, commissions, defaultSpp }) {
  const [cost, setCost] = useState(1000)
  const [spp, setSpp] = useState(defaultSpp || 0)
  const [entKey, setEntKey] = useState('tatyana')
  const [categorySearch, setCategorySearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [selectedCat, setSelectedCat] = useState(null)

  const sortedCommissions = [
    ...commissions.filter(c => RELEVANT_SUBJECTS.includes(c.subjectName)),
    ...commissions.filter(c => !RELEVANT_SUBJECTS.includes(c.subjectName)),
  ]

  useEffect(() => {
    if (!selectedCat && sortedCommissions.length > 0) setSelectedCat(sortedCommissions[0])
  }, [commissions])

  useEffect(() => { setSpp(defaultSpp || 0) }, [defaultSpp])

  const ent = WB_ENTREPRENEURS.find(e => e.key === entKey)
  const cp  = Number(cpCommission) || 0
  const m   = Number(margin) || 0
  const wb  = selectedCat ? (selectedCat.kgvpMarketplace ?? selectedCat.kgvpSupplier ?? 0) : 0
  const tax = ent.taxRate

  const filteredCats = categorySearch
    ? commissions.filter(c => c.subjectName.toLowerCase().includes(categorySearch.toLowerCase()))
    : sortedCommissions

  const sitePrice  = sellPrice(cost, m, cp + tax)
  const siteFee    = sitePrice ? Math.round(sitePrice * cp / 100) : null
  const siteTax    = sitePrice ? Math.round(sitePrice * tax / 100) : null
  const siteProfit = sitePrice ? sitePrice - siteFee - siteTax - cost : null

  const wbPrice     = wb > 0 ? sellPrice(cost, m, wb + tax) : null
  const wbFee       = wbPrice ? Math.round(wbPrice * wb / 100) : null
  const wbTax       = wbPrice ? Math.round(wbPrice * tax / 100) : null
  const wbBuyer     = wbPrice ? Math.round(wbPrice * (1 - Number(spp) / 100)) : null
  const wbProfit    = wbPrice ? wbPrice - wbFee - wbTax - cost : null

  return (
    <div className="a-card" style={{ marginTop: 24 }}>
      <h3 className="a-card-title">Калькулятор цены по каналам</h3>
      <p className="a-muted" style={{ fontSize: '0.82rem', marginBottom: 16 }}>
        При норме прибыли <b style={{ color: '#e8ecff' }}>{m}%</b> и себестоимости ниже —
        какую цену ставить в каждом канале, чтобы получить ровно эту прибыль.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
        <label className="a-field a-field--inline">
          <span>Себестоимость, ₽</span>
          <input
            type="number" className="a-input a-input--sm"
            value={cost} onChange={e => setCost(Number(e.target.value))}
            style={{ width: 120 }}
          />
        </label>

        <label className="a-field a-field--inline">
          <span>СПП, %</span>
          <input
            type="number" className="a-input a-input--sm"
            value={spp} readOnly
            style={{ width: 80, opacity: 0.6, cursor: 'not-allowed' }}
            title="Редактируется в разделе Wildberries"
          />
        </label>

        <label className="a-field a-field--inline">
          <span>ИП</span>
          <div className="a-entrepreneur-toggle" style={{ marginTop: 0 }}>
            {WB_ENTREPRENEURS.map(e => (
              <button
                key={e.key}
                className={`a-entrepreneur-btn${entKey === e.key ? ' active' : ''}`}
                onClick={() => setEntKey(e.key)}
              >
                {e.label}
                <span className="a-entrepreneur-badge">{e.taxSystem} {e.taxRate}%</span>
              </button>
            ))}
          </div>
        </label>

        {commissions.length > 0 && (
          <label className="a-field" style={{ flex: '1 1 280px', minWidth: 240, position: 'relative' }}>
            <span>Категория WB</span>
            <input
              className="a-input a-input--sm"
              style={{ width: '100%' }}
              placeholder="Поиск категории..."
              value={showDrop ? categorySearch : (selectedCat?.subjectName || '')}
              onFocus={() => { setShowDrop(true); setCategorySearch('') }}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              onChange={e => setCategorySearch(e.target.value)}
            />
            {showDrop && filteredCats.length > 0 && (
              <div className="a-wb-cat-search-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}>
                {filteredCats.slice(0, 30).map(c => (
                  <div
                    key={c.subjectID}
                    className={`a-wb-cat-search-item${selectedCat?.subjectID === c.subjectID ? ' active' : ''}`}
                    onMouseDown={() => { setSelectedCat(c); setShowDrop(false) }}
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span>{c.subjectName}</span>
                    <span className="a-muted" style={{ fontSize: '0.8rem' }}>{c.kgvpMarketplace ?? c.kgvpSupplier}%</span>
                  </div>
                ))}
              </div>
            )}
          </label>
        )}
      </div>

      <div className="a-wb-calc-grid">
        {/* Наш сайт */}
        <div className="a-wb-calc-card">
          <div className="a-wb-calc-title">
            Наш сайт
            <span className="a-badge a-badge--purple" style={{ marginLeft: 8 }}>CloudPayments</span>
          </div>
          {sitePrice ? (
            <table className="a-wb-calc-table">
              <tbody>
                <tr><td className="a-muted">Цена продажи</td><td><b>₽{sitePrice.toLocaleString('ru-RU')}</b></td></tr>
                <tr><td className="a-muted">Комиссия CP ({cp}%)</td><td className="a-neg">−₽{siteFee.toLocaleString('ru-RU')}</td></tr>
                <tr><td className="a-muted">Налог {ent.taxSystem} ({tax}%)</td><td className="a-neg">−₽{siteTax.toLocaleString('ru-RU')}</td></tr>
                <tr><td className="a-muted">Себестоимость</td><td className="a-neg">−₽{cost.toLocaleString('ru-RU')}</td></tr>
                <tr className="a-wb-calc-total">
                  <td>Чистая прибыль</td>
                  <td style={{ color: siteProfit >= 0 ? '#4ade80' : '#f87171' }}>
                    ₽{siteProfit.toLocaleString('ru-RU')} ({Math.round(siteProfit / cost * 100)}%)
                  </td>
                </tr>
              </tbody>
            </table>
          ) : <p className="a-muted">Укажите комиссию CP выше</p>}
        </div>

        {/* WB */}
        <div className="a-wb-calc-card">
          <div className="a-wb-calc-title">
            Wildberries
            {selectedCat && <span className="a-badge a-badge--orange" style={{ marginLeft: 8 }}>{wb}%</span>}
          </div>
          {wbPrice ? (
            <table className="a-wb-calc-table">
              <tbody>
                <tr><td className="a-muted">Цена продажи (для WB)</td><td><b>₽{wbPrice.toLocaleString('ru-RU')}</b></td></tr>
                <tr><td className="a-muted">Цена покупателя (−{spp}% СПП)</td><td>₽{wbBuyer.toLocaleString('ru-RU')}</td></tr>
                <tr><td className="a-muted">Комиссия WB ({wb}%)</td><td className="a-neg">−₽{wbFee.toLocaleString('ru-RU')}</td></tr>
                <tr><td className="a-muted">Налог {ent.taxSystem} ({tax}%)</td><td className="a-neg">−₽{wbTax.toLocaleString('ru-RU')}</td></tr>
                <tr><td className="a-muted">Себестоимость</td><td className="a-neg">−₽{cost.toLocaleString('ru-RU')}</td></tr>
                <tr className="a-wb-calc-total">
                  <td>Чистая прибыль</td>
                  <td style={{ color: wbProfit >= 0 ? '#4ade80' : '#f87171' }}>
                    ₽{wbProfit.toLocaleString('ru-RU')} ({wbProfit > 0 ? Math.round(wbProfit / cost * 100) : 0}%)
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="a-muted">
              {commissions.length === 0 ? 'Синхронизируйте комиссии в разделе Wildberries' : 'Выберите категорию выше'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MarkupPage() {
  const [global, setGlobal] = useState('')
  const [perGroup, setPerGroup] = useState({})
  const [cpCommission, setCpCommission] = useState('')
  const [commissions, setCommissions] = useState([])
  const [wbSpp, setWbSpp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminApi.getSettings().then(s => {
      setGlobal(s.markup_global ?? 0)
      setCpCommission(s.cp_commission ?? '')
      try {
        const cache = s.wb_commissions_cache
        if (cache) setCommissions(typeof cache === 'string' ? JSON.parse(cache) : cache)
      } catch {}
      setWbSpp(Number(s.wb_spp) || 0)
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
    const body = {
      markup_global: Number(global),
      cp_commission: cpCommission !== '' ? Number(cpCommission) : null,
    }
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
        <h2>Ценообразование</h2>
        <button className="a-btn a-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем...' : saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>

      {/* Норма прибыли */}
      <div className="a-card">
        <h3 className="a-card-title">Норма прибыли</h3>
        <p className="a-muted" style={{ marginBottom: 12 }}>
          Процент от себестоимости, который должен поступить на счёт после вычета всех комиссий.
          Цена продажи рассчитывается автоматически для каждого канала.
        </p>
        <div className="a-markup-row">
          <label className="a-field a-field--inline">
            <span>Норма прибыли %</span>
            <input
              type="number" min="0" max="100"
              className="a-input a-input--sm"
              value={global}
              onChange={e => setGlobal(e.target.value)}
            />
          </label>
          <div className="a-markup-preview">
            С каждой ₽1 000 себестоимости → ₽{Math.round(1000 * Number(global) / 100)} чистой прибыли
          </div>
        </div>
      </div>

      {/* Комиссии */}
      <div className="a-card">
        <h3 className="a-card-title">Комиссии по каналам</h3>
        <p className="a-muted" style={{ marginBottom: 16 }}>
          Комиссия WB подтягивается из выбранной категории. Редактируется в разделе Wildberries.
        </p>
        <div className="a-field-row">
          <label className="a-field">
            <span>CloudPayments (сайт), %</span>
            <input
              type="number" min="0" max="10" step="0.1"
              className="a-input a-input--sm"
              placeholder="напр. 2.2"
              value={cpCommission}
              onChange={e => setCpCommission(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Калькулятор по каналам */}
      <ChannelCalc
        margin={global}
        cpCommission={cpCommission}
        commissions={commissions}
        defaultSpp={wbSpp}
      />

      {/* Наценка по группам */}
      <div className="a-card" style={{ marginTop: 24 }}>
        <h3 className="a-card-title">Норма прибыли по группам</h3>
        <p className="a-muted">Если поле пустое — используется глобальная норма прибыли.</p>
        <div className="a-markup-grid">
          {GROUPS.map(g => {
            const val = perGroup[g]
            const effective = val !== '' ? Number(val) : Number(global)
            const cp = Number(cpCommission) || 0
            const siteP = sellPrice(1000, effective, cp)
            return (
              <div key={g} className="a-markup-item">
                <span className="a-markup-group">{g}</span>
                <label className="a-field a-field--inline">
                  <input
                    type="number" min="0" max="100"
                    className="a-input a-input--sm"
                    placeholder={`${global}% (глоб.)`}
                    value={val}
                    onChange={e => setPerGroup(p => ({ ...p, [g]: e.target.value }))}
                  />
                  <span className="a-muted">%</span>
                </label>
                <span className="a-markup-result">
                  ₽1 000 → ₽{siteP ? siteP.toLocaleString('ru-RU') : '—'} на сайте
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
