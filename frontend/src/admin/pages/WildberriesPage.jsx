import { useState, useEffect } from 'react'
import { adminApi } from '../adminApi'

const ENTREPRENEURS = [
  { key: 'marina', label: 'Марина', taxSystem: 'АУСН', taxRate: 8 },
  { key: 'tatyana', label: 'Татьяна', taxSystem: 'УСН', taxRate: 6 },
]

const RELEVANT_SUBJECTS = ['Подписки игровых сервисов', 'Диски с играми']

export default function WildberriesPage() {
  const [tokens, setTokens] = useState({ marina: '', tatyana: '' })
  const [visible, setVisible] = useState({ marina: false, tatyana: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncingArticles, setSyncingArticles] = useState(false)
  const [syncingPrices, setSyncingPrices] = useState(false)
  const [pushingCards, setPushingCards] = useState(false)
  const [articlesSyncResult, setArticlesSyncResult] = useState(null)
  const [pricesSyncResult, setPricesSyncResult] = useState(null)
  const [cardsResult, setCardsResult] = useState(null)
  const [pushGroup, setPushGroup] = useState('APPLE ID')
  const [pushTokenKey, setPushTokenKey] = useState('tatyana')
  const [syncError, setSyncError] = useState('')
  const [exportingTemplate, setExportingTemplate] = useState(false)
  const [commissions, setCommissions] = useState([])
  const [updatedAt, setUpdatedAt] = useState(null)
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [sppBySubject, setSppBySubject] = useState({})   // { 'Подписки игровых сервисов': 15, ... }
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')

  useEffect(() => {
    adminApi.getSettings().then(s => {
      setTokens({ marina: s.wb_marina_token || '', tatyana: s.wb_tatyana_token || '' })
      try {
        const sel = s.wb_selected_subjects
        if (sel) setSelectedSubjects(typeof sel === 'string' ? JSON.parse(sel) : sel)
      } catch {}
      try {
        const spp = s.wb_spp_by_subject
        if (spp) setSppBySubject(typeof spp === 'string' ? JSON.parse(spp) : spp)
        const cache = s.wb_commissions_cache
        if (cache) setCommissions(typeof cache === 'string' ? JSON.parse(cache) : cache)
        if (s.wb_commissions_updated_at) setUpdatedAt(s.wb_commissions_updated_at.replace(/"/g, ''))
      } catch {}
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const primary = commissions.find(c => c.subjectName === selectedSubjects[0])
    // wb_spp: берём первое ненулевое значение из введённых SPP
    const firstSpp = Object.values(sppBySubject).find(v => Number(v) > 0) ?? 0
    await adminApi.updateSettings({
      wb_marina_token: tokens.marina,
      wb_tatyana_token: tokens.tatyana,
      wb_selected_subjects: selectedSubjects,
      wb_spp_by_subject: sppBySubject,
      wb_commission: primary ? (primary.kgvpMarketplace ?? primary.kgvpSupplier ?? 0) : 0,
      wb_spp: firstSpp,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handlePushCards() {
    setPushingCards(true)
    setSyncError('')
    setCardsResult(null)
    try {
      const res = await adminApi.pushWbGroupCards(pushGroup, pushTokenKey)
      if (res.error) throw new Error(res.error)
      setCardsResult(res)
    } catch (e) {
      setSyncError(e.message)
    }
    setPushingCards(false)
  }

  async function handleSyncPrices() {
    setSyncingPrices(true)
    setSyncError('')
    setPricesSyncResult(null)
    try {
      const res = await adminApi.syncWbPrices()
      if (res.error) throw new Error(res.error)
      setPricesSyncResult(res)
    } catch (e) {
      setSyncError(e.message)
    }
    setSyncingPrices(false)
  }

  async function handleSyncCommissions() {
    setSyncing(true)
    setSyncError('')
    try {
      const res = await adminApi.syncWbCommissions()
      if (res.error) throw new Error(res.error)
      const settings = await adminApi.getSettings()
      const cache = settings.wb_commissions_cache
      setCommissions(typeof cache === 'string' ? JSON.parse(cache) : (cache || []))
      setUpdatedAt(settings.wb_commissions_updated_at?.replace(/"/g, '') || new Date().toISOString())
    } catch (e) {
      setSyncError(e.message)
    }
    setSyncing(false)
  }

  function toggleSubject(name) {
    setSelectedSubjects(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    )
  }

  function setSpp(subject, value) {
    setSppBySubject(prev => ({ ...prev, [subject]: value === '' ? '' : Number(value) }))
  }

  // В таблице: релевантные + дополнительно выбранные из поиска
  const tableCategories = commissions.filter(c =>
    RELEVANT_SUBJECTS.includes(c.subjectName) ||
    (selectedSubjects.includes(c.subjectName) && !RELEVANT_SUBJECTS.includes(c.subjectName))
  )

  // Категории в поиске/дропдауне для добавления прочих
  const searchCategories = commissions.filter(c => {
    if (!categorySearch) return showAllCategories && !RELEVANT_SUBJECTS.includes(c.subjectName)
    return !RELEVANT_SUBJECTS.includes(c.subjectName) &&
      c.subjectName.toLowerCase().includes(categorySearch.toLowerCase())
  })

  if (loading) return <div className="a-page"><div className="a-loading">Загрузка...</div></div>

  const updatedFmt = updatedAt
    ? new Date(updatedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="a-page">
      <div className="a-page-header">
        <h2>Wildberries</h2>
        <button className="a-btn a-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем...' : saved ? '✓ Сохранено' : '💾 Сохранить'}
        </button>
      </div>

      {saved && <div className="a-alert a-alert--success">Настройки сохранены</div>}
      {syncError && <div className="a-alert a-alert--error">{syncError}</div>}
      {cardsResult && (
        <div className="a-alert a-alert--success">
          Карточки созданы: {cardsResult.created} из {cardsResult.total}
          {cardsResult.nmids_saved > 0 && ` · nmID сохранено: ${cardsResult.nmids_saved}`}
          {cardsResult.errors > 0 && ` · ошибок: ${cardsResult.errors}`}
        </div>
      )}
      {pricesSyncResult && (
        <div className="a-alert a-alert--success">
          Цены на WB обновлены: загружено {pricesSyncResult.pushed} из {pricesSyncResult.total}
          {pricesSyncResult.errors > 0 && ` · ошибок: ${pricesSyncResult.errors}`}
        </div>
      )}

      {/* Создание карточек */}
      <div className="a-card">
        <h3 className="a-card-title" style={{ marginBottom: 8 }}>Создать карточки товаров на WB</h3>
        <p className="a-muted" style={{ fontSize: '0.82rem', marginBottom: 14 }}>
          Создаёт карточки в категории «Подписки игровых сервисов» для выбранной группы.
          Артикул продавца: <code style={{ color: '#c4acff' }}>CG-&#123;product_id&#125;</code>.
          После создания nmID сохраняется в БД и цены начинают обновляться автоматически.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="a-col-filter"
            style={{ flex: '1 1 180px', maxWidth: 240 }}
            placeholder="Группа (напр. APPLE ID)"
            value={pushGroup}
            onChange={e => setPushGroup(e.target.value)}
          />
          <select
            className="a-col-filter"
            style={{ minWidth: 130 }}
            value={pushTokenKey}
            onChange={e => setPushTokenKey(e.target.value)}
          >
            <option value="tatyana">Татьяна</option>
            <option value="marina">Марина</option>
          </select>
          <button
            className="a-btn a-btn--primary a-btn--sm"
            onClick={handlePushCards}
            disabled={pushingCards}
          >
            {pushingCards ? 'Создаём карточки...' : '↑ Создать карточки на WB'}
          </button>
        </div>
      </div>

      <div className="a-card">
        <h3 className="a-card-title" style={{ marginBottom: 8 }}>Цены на Wildberries</h3>
        <p className="a-muted" style={{ fontSize: '0.82rem', marginBottom: 12 }}>
          Загружает цены для товаров у которых есть nmID в БД.
          Запускайте вручную после создания карточек.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="a-btn a-btn--primary a-btn--sm" onClick={handleSyncPrices} disabled={syncingPrices}>
            {syncingPrices ? 'Загружаем цены...' : '↑ Загрузить цены на WB'}
          </button>
          <button
            className="a-btn a-btn--danger a-btn--sm"
            onClick={async () => {
              if (!confirm('Сбросить все nmID в БД? Это удалит связь с WB-карточками.')) return
              const r = await adminApi.resetWbNmids()
              alert(`Сброшено. Осталось nmID: ${r.remaining}`)
            }}
          >
            ✕ Сбросить все nmID
          </button>
        </div>
      </div>

      {/* Категории и комиссии */}
      <div className="a-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 className="a-card-title" style={{ marginBottom: 4 }}>Категории и комиссии</h3>
            <p className="a-muted" style={{ fontSize: '0.82rem' }}>
              Комиссии обновляются автоматически каждый день в 03:15.
              {updatedFmt && <> Последнее обновление: <b style={{ color: '#e8ecff' }}>{updatedFmt}</b>.</>}
            </p>
          </div>
          <button className="a-btn a-btn--ghost a-btn--sm" onClick={handleSyncCommissions} disabled={syncing} style={{ flexShrink: 0 }}>
            {syncing ? 'Запрашиваем...' : '↻ Обновить сейчас'}
          </button>
        </div>

        {commissions.length === 0 ? (
          <p className="a-muted" style={{ fontSize: '0.82rem' }}>
            Нажмите «Обновить сейчас» после добавления токена WB — загрузим список категорий с комиссиями.
          </p>
        ) : (
          <>
            <table className="a-wb-cat-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Категория</th>
                  <th style={{ width: 130 }}>Комиссия WB</th>
                  <th style={{ width: 150 }}>СПП покупателя</th>
                </tr>
              </thead>
              <tbody>
                {tableCategories.map(c => {
                  const isChecked = selectedSubjects.includes(c.subjectName)
                  const wbPct = c.kgvpMarketplace ?? c.kgvpSupplier ?? '—'
                  return (
                    <tr
                      key={c.subjectID}
                      className={isChecked ? 'a-wb-cat-row--active' : ''}
                      onClick={() => toggleSubject(c.subjectName)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSubject(c.subjectName)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td style={{ fontWeight: isChecked ? 600 : 400 }}>{c.subjectName}</td>
                      <td>
                        <span className="a-badge a-badge--purple">{wbPct}%</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            className="a-input a-input--sm"
                            style={{ width: 70 }}
                            placeholder="0"
                            value={sppBySubject[c.subjectName] ?? ''}
                            onChange={e => setSpp(c.subjectName, e.target.value)}
                          />
                          <span className="a-muted">%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Поиск доп. категорий */}
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
              <div className="a-cat-search-wrap" style={{ maxWidth: 340 }}>
                <input
                  className="a-input a-cat-search-input"
                  placeholder="Найти другую категорию..."
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                />
                {categorySearch && (
                  <button className="a-cat-search-clear" onClick={() => setCategorySearch('')}>×</button>
                )}
              </div>
              {(categorySearch || showAllCategories) && searchCategories.length > 0 && (
                <div className="a-wb-cat-search-results">
                  {searchCategories.slice(0, 30).map(c => {
                    const isChecked = selectedSubjects.includes(c.subjectName)
                    return (
                      <div
                        key={c.subjectID}
                        className={`a-wb-cat-search-item${isChecked ? ' active' : ''}`}
                        onClick={() => toggleSubject(c.subjectName)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleSubject(c.subjectName)} onClick={e => e.stopPropagation()} />
                          <span>{c.subjectName}</span>
                        </div>
                        <span className="a-muted" style={{ fontSize: '0.8rem' }}>{c.kgvpMarketplace ?? c.kgvpSupplier}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {!categorySearch && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showAllCategories} onChange={e => setShowAllCategories(e.target.checked)} />
                  <span className="a-muted">Показать все {commissions.length} категорий</span>
                </label>
              )}
            </div>
          </>
        )}
      </div>

      {/* Токены */}
      <div className="a-wb-tokens-grid">
        {ENTREPRENEURS.map(({ key, label, taxSystem, taxRate }) => (
          <div key={key} className="a-card">
            <div className="a-card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {label}
              <span className="a-badge a-badge--purple">{taxSystem}</span>
              <span className="a-badge a-badge--orange">{taxRate}% от выручки</span>
            </div>
            <p className="a-muted" style={{ fontSize: '0.78rem', marginBottom: 12 }}>
              JWT-токен для API Wildberries. Срок действия 180 дней. Выдаётся в ЛК WB → Настройки → Доступ к API.
            </p>
            <div className="a-token-row">
              <input
                className="a-input"
                type={visible[key] ? 'text' : 'password'}
                placeholder="Введите токен WB..."
                value={tokens[key]}
                onChange={e => setTokens(t => ({ ...t, [key]: e.target.value }))}
                autoComplete="off"
                spellCheck={false}
              />
              <button className="a-btn a-btn--ghost a-btn--sm a-token-eye" onClick={() => setVisible(v => ({ ...v, [key]: !v[key] }))} title={visible[key] ? 'Скрыть' : 'Показать'}>
                {visible[key] ? '🙈' : '👁'}
              </button>
              {tokens[key] && (
                <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => navigator.clipboard.writeText(tokens[key])} title="Скопировать">📋</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Синхронизация артикулов */}
      <div className="a-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="a-card-title" style={{ marginBottom: 4 }}>Артикулы WB</h3>
            <p className="a-muted" style={{ fontSize: '0.82rem' }}>
              Сопоставляет товары WB с нашей базой по артикулу продавца (V-APPLE-1845 → product_id 1845).
              Обновляется автоматически в 03:20 ежедневно.
            </p>
          </div>
          <button
            className="a-btn a-btn--ghost a-btn--sm"
            disabled={syncingArticles}
            style={{ flexShrink: 0 }}
            onClick={async () => {
              setSyncingArticles(true)
              setArticlesSyncResult(null)
              try {
                const res = await adminApi.syncWbArticles()
                if (res.error) throw new Error(res.error)
                setArticlesSyncResult(res)
              } catch (e) { setSyncError(e.message) }
              setSyncingArticles(false)
            }}
          >
            {syncingArticles ? 'Синхронизируем...' : '↻ Обновить сейчас'}
          </button>
        </div>
        {articlesSyncResult && (
          <p className="a-muted" style={{ marginTop: 12, fontSize: '0.82rem' }}>
            Готово: сопоставлено <b style={{ color: '#4ade80' }}>{articlesSyncResult.matched}</b> из {articlesSyncResult.total} товаров WB.
            {articlesSyncResult.unmatched > 0 && ` Не найдено: ${articlesSyncResult.unmatched}.`}
          </p>
        )}
      </div>

      {/* Экспорт шаблона */}
      <div className="a-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="a-card-title" style={{ marginBottom: 4 }}>Шаблон для загрузки товаров</h3>
            <p className="a-muted" style={{ fontSize: '0.82rem' }}>
              Формирует Excel-файл для кабинета Татьяны (УСН 6%). Включает товары с артикулом WB и локальными фотографиями —
              всего {' '}<b style={{ color: '#e8ecff' }}>139 товаров</b>. Цена рассчитывается по текущим настройкам ценообразования.
            </p>
          </div>
          <button
            className="a-btn a-btn--primary a-btn--sm"
            disabled={exportingTemplate}
            style={{ flexShrink: 0 }}
            onClick={async () => {
              setExportingTemplate(true)
              setSyncError('')
              try {
                await adminApi.downloadWbTemplate()
              } catch (e) { setSyncError(e.message) }
              setExportingTemplate(false)
            }}
          >
            {exportingTemplate ? 'Формируем...' : '↓ Скачать шаблон'}
          </button>
        </div>
      </div>

      <p className="a-muted" style={{ marginTop: 8, fontSize: '0.82rem' }}>
        Калькулятор цен по каналам находится в разделе «Ценообразование».
      </p>
    </div>
  )
}
