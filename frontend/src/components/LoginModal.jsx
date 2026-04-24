import { useEffect, useRef, useState } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function GoogleButton({ onLogin }) {
  const btnRef = useRef(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (res) => {
        // Decode JWT to get email
        const payload = JSON.parse(atob(res.credential.split('.')[1]))
        onLogin({ email: payload.email, name: payload.name })
      },
    })
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: '100%',
      text: 'signin_with',
      shape: 'rectangular',
      locale: 'ru',
    })
  }, [onLogin])

  if (!GOOGLE_CLIENT_ID) return null

  return <div ref={btnRef} style={{ width: '100%' }} />
}

function CodeBoxes({ value, onChange }) {
  const inputs = useRef([])

  function handleChange(i, e) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const arr = value.split('')
    arr[i] = digit
    const next = arr.join('')
    onChange(next)
    if (digit && i < 3) inputs.current[i + 1]?.focus()
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted) { onChange(pasted); inputs.current[Math.min(pasted.length, 3)]?.focus() }
    e.preventDefault()
  }

  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="login-code-box"
          autoFocus={i === 0}
        />
      ))}
    </div>
  )
}

function LoginModal({ visible, initialEmail, onClose, onSendCode, onVerifyCode, onGoogleLogin, codeSent }) {
  const [email, setEmail] = useState(initialEmail || '')
  const [code, setCode]   = useState('')
  const [step, setStep]   = useState('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const emailRef = useRef(null)

  useEffect(() => {
    setEmail(initialEmail || '')
    setCode('')
    setError('')
    setStep(codeSent ? 'verify' : 'email')
  }, [initialEmail, codeSent])

  useEffect(() => {
    if (visible && step === 'email') setTimeout(() => emailRef.current?.focus(), 50)
  }, [visible, step])

  if (!visible) return null

  async function sendCode() {
    if (!email) return
    setLoading(true); setError('')
    try { await onSendCode(email); setStep('verify') }
    catch { setError('Не удалось отправить код. Попробуйте ещё раз.') }
    setLoading(false)
  }

  async function verifyCode() {
    if (code.length !== 4) return
    setLoading(true); setError('')
    try { await onVerifyCode(code) }
    catch { setError('Неверный код. Попробуйте ещё раз.') }
    setLoading(false)
  }

  function handleEmailKey(e) { if (e.key === 'Enter') sendCode() }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card login-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="login-modal-header">
          {step === 'verify' && (
            <button className="login-back-btn" onClick={() => { setStep('email'); setCode(''); setError('') }}>
              ←
            </button>
          )}
          <h2 className="login-title">
            {step === 'email' ? 'Войти в аккаунт' : 'Введите код'}
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Step: email */}
        {step === 'email' && (
          <div className="login-body">
            <p className="login-subtitle">
              Введите email — пришлём код для входа.<br />
              Сохранится корзина и история заказов.
            </p>

            {GOOGLE_CLIENT_ID && (
              <>
                <GoogleButton onLogin={onGoogleLogin} />
                <div className="login-divider"><span>или</span></div>
              </>
            )}

            <div className="login-field">
              <label className="login-label">Email</label>
              <input
                ref={emailRef}
                type="email"
                className="login-input"
                placeholder="your@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={handleEmailKey}
                autoComplete="email"
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              className="btn-primary login-submit"
              onClick={sendCode}
              disabled={!email || loading}
            >
              {loading ? 'Отправляем...' : 'Получить код'}
            </button>
          </div>
        )}

        {/* Step: verify */}
        {step === 'verify' && (
          <div className="login-body">
            <p className="login-subtitle">
              Код отправлен на <b style={{ color: '#e8ecff' }}>{email}</b>
            </p>

            <CodeBoxes value={code} onChange={v => { setCode(v); setError('') }} />

            {error && <p className="login-error" style={{ textAlign: 'center' }}>{error}</p>}

            <button
              className="btn-primary login-submit"
              onClick={verifyCode}
              disabled={code.length !== 4 || loading}
            >
              {loading ? 'Проверяем...' : 'Войти'}
            </button>

            <button className="login-resend" onClick={() => { setCode(''); sendCode() }}>
              Отправить код повторно
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default LoginModal
