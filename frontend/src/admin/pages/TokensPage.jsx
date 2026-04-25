import { useState, useEffect } from 'react'
import { adminApi } from '../adminApi'

const TOKEN_FIELDS = [
  { key: 'token_fp_products', label: 'ForeignPay — цифровые товары', hint: 'Bearer-токен для /get-products, /voucher/buy и др.' },
  { key: 'token_fp_games',    label: 'ForeignPay — игры',            hint: 'Bearer-токен для /get-games (может совпадать с выше)' },
  { key: 'token_cloudpayments', label: 'CloudPayments — Public ID',  hint: 'Публичный ключ мерчанта CloudPayments' },
  { key: 'token_cloudpayments_secret', label: 'CloudPayments — Secret Key', hint: 'Секретный ключ мерчанта CloudPayments' },
  { key: 'token_bybit',       label: 'Bybit API Key',                hint: 'API-ключ Bybit' },
  { key: 'token_bybit_secret', label: 'Bybit API Secret',            hint: 'Секрет Bybit' },
  { key: 'ggsell_api_key',    label: 'GGSell — API Key',             hint: 'X-API-Key для api.g-engine.net — второй поставщик товаров' },
  { key: 'token_custom_1',    label: 'Дополнительный токен 1',       hint: '' },
  { key: 'token_custom_2',    label: 'Дополнительный токен 2',       hint: '' },
]

export default function TokensPage() {
  const [values, setValues] = useState({})
  const [visible, setVisible] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getSettings().then(settings => {
      const vals = {}
      for (const f of TOKEN_FIELDS) vals[f.key] = settings[f.key] || ''
      setValues(vals)
      setLoading(false)
    })
  }, [])

  function set(key, value) {
    setValues(v => ({ ...v, [key]: value }))
    setSaved(false)
  }

  function toggleVisible(key) {
    setVisible(v => ({ ...v, [key]: !v[key] }))
  }

  async function handleSave() {
    setSaving(true)
    const payload = {}
    for (const f of TOKEN_FIELDS) {
      payload[f.key] = values[f.key] || ''
    }
    await adminApi.updateSettings(payload)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="a-page"><div className="a-loading">Загрузка...</div></div>

  return (
    <div className="a-page">
      <div className="a-page-header">
        <h2>Токены API</h2>
        <button className="a-btn a-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохраняем...' : '💾 Сохранить'}
        </button>
      </div>

      {saved && (
        <div className="a-alert a-alert--success">Токены сохранены</div>
      )}

      <p className="a-muted" style={{ marginBottom: 24, fontSize: '0.875rem' }}>
        Токены хранятся в базе данных. Не передавайте их третьим лицам.
      </p>

      <div className="a-tokens-grid">
        {TOKEN_FIELDS.map(f => (
          <div key={f.key} className="a-card">
            <div className="a-card-title">{f.label}</div>
            {f.hint && <div className="a-muted" style={{ fontSize: '0.78rem', marginBottom: 10 }}>{f.hint}</div>}
            <div className="a-token-row">
              <input
                className="a-input"
                type={visible[f.key] ? 'text' : 'password'}
                placeholder="Введите токен..."
                value={values[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="a-btn a-btn--ghost a-btn--sm a-token-eye"
                onClick={() => toggleVisible(f.key)}
                title={visible[f.key] ? 'Скрыть' : 'Показать'}
              >
                {visible[f.key] ? '🙈' : '👁'}
              </button>
              {values[f.key] && (
                <button
                  className="a-btn a-btn--ghost a-btn--sm"
                  onClick={() => { navigator.clipboard.writeText(values[f.key]) }}
                  title="Скопировать"
                >
                  📋
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
