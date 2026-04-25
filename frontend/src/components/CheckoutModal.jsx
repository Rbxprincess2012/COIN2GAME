import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'
import { API_BASE } from '../config.js'

const IS_TEST_MODE = import.meta.env.DEV || import.meta.env.VITE_TEST_MODE === 'true'

// Extract displayable code/key from product info response
function extractResult(info) {
  if (!info?.data) return null
  const d = info.data
  if (d.voucher) return { type: 'voucher', code: d.voucher, instruction: d.instruction, activationUrl: d.activation_url }
  if (d.activation_code) return { type: 'code', code: d.activation_code, instruction: d.instruction, activationUrl: d.activation_url }
  if (d.activation_url) return { type: 'link', activationUrl: d.activation_url, instruction: d.instruction }
  if (d.card_number) return { type: 'card', cardNumber: d.card_number, cvc: d.cvc, expDate: d.exp_date, instruction: d.instruction }
  return null
}

const FIELD_HINTS = {
  player_id: 'Ваш игровой ID — найдите в профиле игры',
  user_id:   'Ваш игровой ID — найдите в профиле игры',
  character_id: 'ID персонажа из игры',
  server:    'Выберите сервер вашего аккаунта',
}

// Render topup form field
function TopupField({ field, value, onChange }) {
  if (field.name === 'product_id') return null
  const hint = FIELD_HINTS[field.name]
  if (field.type === 'options') {
    return (
      <label className="topup-field">
        <span>{field.label || field.name}</span>
        {hint && <span className="topup-field-hint">{hint}</span>}
        <select value={value || ''} onChange={e => onChange(field.name, e.target.value)}>
          <option value="">— выберите —</option>
          {(field.options || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.name || opt.product}</option>
          ))}
        </select>
      </label>
    )
  }
  return (
    <label className="topup-field">
      <span>{field.label || field.name}</span>
      {hint && <span className="topup-field-hint">{hint}</span>}
      <input
        type={field.type === 'password' ? 'password' : 'text'}
        value={value || ''}
        placeholder={field.placeholder || field.label || field.name}
        onChange={e => onChange(field.name, e.target.value)}
      />
    </label>
  )
}

// Code/result display
function ResultBlock({ result, onCopy, copied }) {
  if (!result) return null

  if (result.type === 'card') {
    return (
      <div className="code-block">
        <p className="label">Реквизиты карты</p>
        <div className="card-creds">
          <div><span className="label">Номер</span><span className="code-value">{result.cardNumber}</span></div>
          <div><span className="label">CVC</span><span className="code-value">{result.cvc}</span></div>
          <div><span className="label">Срок</span><span className="code-value">{result.expDate}</span></div>
        </div>
        <button className="btn-copy" onClick={() => onCopy(result.cardNumber)}>{copied ? '✓ Скопировано' : 'Копировать номер'}</button>
      </div>
    )
  }

  if (result.type === 'link') {
    return (
      <div className="code-block">
        <p className="label">Ссылка активации</p>
        <a href={result.activationUrl} target="_blank" rel="noopener noreferrer" className="btn-primary checkout-btn">
          Активировать →
        </a>
      </div>
    )
  }

  return (
    <div className="code-block">
      <p className="label">Код активации</p>
      <div className="code-value">{result.code}</div>
      {result.activationUrl && (
        <a href={result.activationUrl} target="_blank" rel="noopener noreferrer" className="code-link">Открыть страницу активации</a>
      )}
      <button className="btn-copy" onClick={() => onCopy(result.code)}>{copied ? '✓ Скопировано' : 'Копировать'}</button>
    </div>
  )
}

// Load CloudPayments widget script once
function loadCpScript() {
  if (window.cp) return Promise.resolve()
  return new Promise((resolve) => {
    if (document.querySelector('script[data-cp]')) {
      const wait = setInterval(() => { if (window.cp) { clearInterval(wait); resolve() } }, 100)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://widget.cloudpayments.ru/bundles/cloudpayments.js'
    s.setAttribute('data-cp', '1')
    s.onload = resolve
    document.head.appendChild(s)
  })
}

export default function CheckoutModal({ visible, items, userEmail, isLoggedIn, onClose, onLogin, productTypeMap }) {
  const [step, setStep]           = useState('summary') // summary | topup-form | paying | done-item | all-done | error
  const [currentIdx, setCurrentIdx] = useState(0)
  const [sbpData, setSbpData]     = useState(null)
  const [itemResult, setItemResult] = useState(null)
  const [topupFields, setTopupFields] = useState([])
  const [topupValues, setTopupValues] = useState({})
  const [loadingForm, setLoadingForm] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)
  const [cpAvailable, setCpAvailable] = useState(null) // null=unknown, true/false
  const completedItems            = useRef([])
  const pollTimer                 = useRef(null)
  const pendingTopupData          = useRef({})

  const currentItem = items[currentIdx]
  const total = items.reduce((sum, item) => sum + item.price, 0)

  function getType(item) {
    if (item.product_type === 'Game') return 'VOUCHER'
    return productTypeMap?.[String(item.id)] || 'VOUCHER'
  }

  // Preload widget script and check if CP is configured
  useEffect(() => {
    api.getConfig().then(cfg => setCpAvailable(!!cfg.cp_public_id))
    loadCpScript()
  }, [])

  const stopPolling = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null }
  }, [])

  function reset() {
    stopPolling()
    setStep('summary')
    setCurrentIdx(0)
    setSbpData(null)
    setItemResult(null)
    setTopupFields([])
    setTopupValues({})
    setError('')
    completedItems.current = []
    pendingTopupData.current = {}
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Poll ForeignPay transaction status (fallback / SBP flow)
  function startPolling(sbp_uuid) {
    stopPolling()
    pollTimer.current = setInterval(async () => {
      try {
        const status = await api.txStatus(sbp_uuid)
        if (status.status === 'Paid' || status.status === 'Success') {
          stopPolling()
          const info = await api.productInfo(sbp_uuid)
          const result = extractResult(info)
          completedItems.current.push({ item: currentItem, result })
          setItemResult(result)
          setStep('done-item')
        } else if (status.status === 'Expired' || status.status === 'Failed') {
          stopPolling()
          setError('Время оплаты истекло. Попробуйте оформить снова.')
          setStep('error')
        }
      } catch { /* network blip */ }
    }, 3000)
  }

  // ── CloudPayments widget flow ─────────────────────────────────────────────

  async function openCpWidget(topupExtra = {}) {
    setLoading(true)
    setError('')

    const config = await api.getConfig()
    if (!config.cp_public_id) {
      setError('Платёжная система не настроена. Обратитесь к администратору.')
      setStep('error')
      setLoading(false)
      return
    }

    await loadCpScript()
    setLoading(false)

    const order_id = `c2g_${Date.now()}`
    pendingTopupData.current = topupExtra

    const widget = new window.cp.CloudPayments()

    widget.oncomplete = async (result) => {
      if (result.type === 'payment' && result.status === 'success') {
        setStep('paying')
        try {
          const type = getType(currentItem)
          const data = await api.cpComplete({
            transaction_id: result.data?.transactionId,
            order_id,
            product_id: currentItem.id,
            product_type: type,
            email: userEmail,
            topup_data: type === 'TOPUP' ? pendingTopupData.current : undefined,
          })

          // Результат может прийти сразу или через polling
          const extracted = extractResult(data)
          if (extracted) {
            completedItems.current.push({ item: currentItem, result: extracted })
            setItemResult(extracted)
            setStep('done-item')
          } else if (data.sbp_uuid || data.transaction_id) {
            setSbpData(data)
            startPolling(data.sbp_uuid || data.transaction_id)
          } else {
            setError(data.comment || data.error || 'Товар не удалось доставить. Свяжитесь с поддержкой.')
            setStep('error')
          }
        } catch {
          setError('Ошибка соединения с сервером')
          setStep('error')
        }
      } else if (result.type === 'cancel') {
        // Пользователь закрыл виджет — возвращаемся
        setStep(getType(currentItem) === 'TOPUP' && Object.keys(topupExtra).length ? 'topup-form' : 'summary')
      } else {
        setError(result.message || 'Оплата не прошла. Попробуйте ещё раз.')
        setStep('error')
      }
    }

    widget.start({
      publicTerminalId: config.cp_public_id,
      amount: currentItem.price,
      currency: 'RUB',
      description: currentItem.title,
      externalId: order_id,
      receiptEmail: userEmail || undefined,
      skin: 'modern',
      culture: 'ru-RU',
      retryPayment: true,
      emailBehavior: userEmail ? 'Hidden' : 'Required',
    })
  }

  // ── Fallback: ForeignPay SBP flow ─────────────────────────────────────────

  async function createOrderSbp(topupExtra = {}) {
    setLoading(true)
    setError('')
    try {
      const type = getType(currentItem)
      const success_url = window.location.origin
      const order_id = `c2g_${Date.now()}`

      let data
      if (type === 'VOUCHER') {
        data = await api.buyVoucher({ product_id: parseInt(currentItem.id), email: userEmail, success_url, order_id })
      } else {
        data = await api.buyTopup({ ...topupExtra, product_id: parseInt(currentItem.id), success_url, order_id })
      }

      if (!data.status) {
        setError(data.comment || 'Ошибка при создании заказа')
        setStep('error')
        setLoading(false)
        return
      }

      setSbpData(data)
      setStep('paying')
      if (data.sbp_url) window.open(data.sbp_url, '_blank')
      startPolling(data.sbp_uuid)
    } catch {
      setError('Ошибка соединения с сервером')
      setStep('error')
    }
    setLoading(false)
  }

  // ── Shared handlers ───────────────────────────────────────────────────────

  async function loadTopupForm() {
    setLoadingForm(true)
    try {
      const data = await api.fpGroupForm(currentItem.service)
      const allFields = data.forms?.topup_fields || []

      // Авто-заполняем: region с 1 вариантом, email, product_id
      const autoValues = {}
      const visibleFields = []

      for (const f of allFields) {
        if (f.name === 'product_id') {
          // Ищем соответствующий вариант по нашему product_id
          const match = (f.options || []).find(o => String(o.value) === String(currentItem.id))
          autoValues[f.name] = match ? match.value : (f.options?.[0]?.value ?? '')
          continue
        }
        if (f.name === 'email') {
          autoValues[f.name] = userEmail
          continue
        }
        if (f.type === 'options' && (f.options || []).length === 1) {
          autoValues[f.name] = f.options[0].value
          continue
        }
        visibleFields.push(f)
      }

      setTopupValues(v => ({ ...autoValues, ...v }))

      if (visibleFields.length === 0) {
        // Все поля авто-заполнены — сразу к оплате
        pendingTopupData.current = autoValues
        if (cpAvailable) openCpWidget(autoValues)
        else createOrderSbp(autoValues)
      } else {
        setTopupFields(visibleFields)
        setStep('topup-form')
      }
    } catch {
      setError('Не удалось загрузить форму товара')
      setStep('error')
    }
    setLoadingForm(false)
  }

  function handlePay() {
    if (!isLoggedIn) { onLogin(); return }
    const type = getType(currentItem)
    if (type === 'TOPUP') {
      loadTopupForm()
    } else if (cpAvailable) {
      openCpWidget()
    } else {
      createOrderSbp()
    }
  }

  function handleTopupSubmit(e) {
    e.preventDefault()
    if (cpAvailable) {
      openCpWidget(topupValues)
    } else {
      createOrderSbp(topupValues)
    }
  }

  function handleNextItem() {
    const nextIdx = currentIdx + 1
    if (nextIdx >= items.length) {
      setStep('all-done')
    } else {
      setCurrentIdx(nextIdx)
      setSbpData(null)
      setItemResult(null)
      setTopupFields([])
      setTopupValues({})
      setError('')
      pendingTopupData.current = {}
      setStep('summary')
    }
  }

  useEffect(() => { return () => stopPolling() }, [stopPolling])

  if (!visible) return null

  return (
    <div className="modal-backdrop" onClick={step === 'paying' ? undefined : handleClose}>
      <div className="modal-card checkout-modal" onClick={e => e.stopPropagation()}>

        {/* ── Summary ──────────────────────────────────────────────── */}
        {step === 'summary' && (
          <>
            <div className="modal-header">
              <h2>{items.length > 1 ? `Оформление — товар ${currentIdx + 1} из ${items.length}` : 'Оформление заказа'}</h2>
              <button className="close-button" onClick={handleClose}>×</button>
            </div>

            <div className="checkout-body">
            <div className="checkout-items">
              {(items.length === 1 ? items : [currentItem]).map((item) => (
                <div key={item.cartKey || item.id} className="checkout-item">
                  <div>
                    <p className="checkout-item-title">{item.title}</p>
                    <p className="checkout-item-meta">{item.platform} · Регион: {item.region}</p>
                    <p className="checkout-item-meta type-badge">{getType(item)}</p>
                  </div>
                  <span className="checkout-item-price">₽{item.price.toLocaleString('ru-RU')}</span>
                </div>
              ))}
            </div>

            {items.length === 1 && (
              <div className="checkout-total">
                <span>Итого</span>
                <span className="checkout-total-price">₽{total.toLocaleString('ru-RU')}</span>
              </div>
            )}

            {!isLoggedIn && (
              <p className="checkout-warn">Войдите через email, чтобы код пришёл на почту.</p>
            )}

            <div className="checkout-delivery">
              <span className="label">Email для доставки</span>
              <p>{isLoggedIn ? userEmail : 'Войдите, чтобы указать email'}</p>
            </div>

            <button className="btn-primary checkout-btn" onClick={handlePay} disabled={loading || loadingForm}>
              {loadingForm ? 'Загрузка...'
                : !isLoggedIn ? 'Войти и оплатить'
                : cpAvailable ? `💳 Оплатить картой ₽${currentItem?.price.toLocaleString('ru-RU')}`
                : `Оплатить ₽${currentItem?.price.toLocaleString('ru-RU')}`
              }
            </button>
            {cpAvailable && isLoggedIn && (
              <p className="checkout-meta-sub" style={{ textAlign: 'center', marginTop: 8 }}>
                Visa, Mastercard, МИР — безопасная оплата через CloudPayments
              </p>
            )}
            {IS_TEST_MODE && isLoggedIn && (
              <button
                className="btn-secondary checkout-btn"
                style={{ marginTop: 8, opacity: 0.7, fontSize: '0.8rem' }}
                onClick={async () => {
                  setLoading(true)
                  try {
                    const res = await fetch(`${API_BASE}/api/test-purchase`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ product_id: currentItem?.id, email: userEmail }),
                    })
                    const data = await res.json()
                    if (data.ok) {
                      setItemResult({ type: 'code', code: data.code || data.voucher_code, instruction: 'Это тестовый заказ. Код не является реальным.' })
                      setStep('done-item')
                    }
                  } catch {}
                  setLoading(false)
                }}
                disabled={loading}
              >
                🧪 Тестовый заказ (без оплаты)
              </button>
            )}
            </div>{/* end checkout-body */}
          </>
        )}

        {/* ── TOPUP form ───────────────────────────────────────────── */}
        {step === 'topup-form' && (
          <>
            <div className="modal-header">
              <h2>Данные аккаунта</h2>
              <button className="close-button" onClick={() => setStep('summary')}>×</button>
            </div>
            <p className="checkout-meta">{currentItem?.title}</p>
            <form className="topup-form" onSubmit={handleTopupSubmit}>
              {topupFields.map(field => (
                <TopupField
                  key={field.name}
                  field={field}
                  value={topupValues[field.name] || ''}
                  onChange={(name, val) => setTopupValues(prev => ({ ...prev, [name]: val }))}
                />
              ))}
              <button type="submit" className="btn-primary checkout-btn" disabled={loading}>
                {loading ? 'Подождите...'
                  : cpAvailable ? `💳 Оплатить картой ₽${currentItem?.price.toLocaleString('ru-RU')}`
                  : `Оплатить ₽${currentItem?.price.toLocaleString('ru-RU')}`}
              </button>
            </form>
          </>
        )}

        {/* ── Paying (polling) ─────────────────────────────────────── */}
        {step === 'paying' && (
          <div className="checkout-paying">
            <div className="spinner" />
            <h3>Ожидаем оплату</h3>
            <p className="checkout-meta">{sbpData?.product}</p>
            <p className="checkout-meta-sub">Оплата открыта в новой вкладке. Как только оплатите — код появится здесь автоматически.</p>
            {sbpData?.sbp_url && (
              <a href={sbpData.sbp_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Открыть платёж снова
              </a>
            )}
            {sbpData?.qr_url && (
              <div className="sbp-qr">
                <img src={sbpData.qr_url} alt="QR для оплаты" />
                <p className="checkout-meta-sub">Или отсканируйте QR-код</p>
              </div>
            )}
          </div>
        )}

        {/* ── Done item ────────────────────────────────────────────── */}
        {step === 'done-item' && (
          <>
            <div className="done-header">
              <div className="done-icon">✓</div>
              <h2>Оплата прошла успешно!</h2>
              <p className="modal-description">{currentItem?.title}</p>
            </div>

            <ResultBlock result={itemResult} onCopy={handleCopy} copied={copied} />

            {itemResult?.instruction && (
              <details className="instruction-details">
                <summary>Инструкция по активации</summary>
                <pre className="instruction-text">{itemResult.instruction}</pre>
              </details>
            )}

            {currentIdx + 1 < items.length ? (
              <button className="btn-primary checkout-btn" onClick={handleNextItem}>
                Следующий товар ({currentIdx + 2} из {items.length}) →
              </button>
            ) : (
              <button className="btn-primary checkout-btn" onClick={handleClose}>
                Закрыть
              </button>
            )}
          </>
        )}

        {/* ── All done ─────────────────────────────────────────────── */}
        {step === 'all-done' && (
          <>
            <div className="done-header">
              <div className="done-icon">✓</div>
              <h2>Все товары получены!</h2>
            </div>
            <div className="all-done-list">
              {completedItems.current.map(({ item, result }, i) => (
                <div key={i} className="all-done-item">
                  <p className="checkout-item-title">{item.title}</p>
                  {result?.code && <div className="code-value code-value--sm">{result.code}</div>}
                  {result?.activationUrl && (
                    <a href={result.activationUrl} target="_blank" rel="noopener noreferrer" className="code-link">Активировать</a>
                  )}
                </div>
              ))}
            </div>
            <button className="btn-primary checkout-btn" onClick={handleClose}>Закрыть</button>
          </>
        )}

        {/* ── Error ────────────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="checkout-error">
            <div className="error-icon">✕</div>
            <h3>Ошибка</h3>
            <p>{error}</p>
            <button className="btn-secondary" onClick={() => setStep('summary')}>Попробовать снова</button>
            <button className="btn-tertiary" onClick={handleClose}>Закрыть</button>
          </div>
        )}

      </div>
    </div>
  )
}
