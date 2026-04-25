import { useEffect, useRef, useState } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function GoogleButton({ onLogin }) {
  const overlayRef = useRef(null)
  const outerRef = useRef(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const init = () => {
      if (!window.google || !overlayRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => {
          try {
            const b64 = res.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
            const padded = b64 + '='.repeat((4 - b64.length % 4) % 4)
            const payload = JSON.parse(atob(padded))
            if (payload.email) onLogin({ email: payload.email, name: payload.name || payload.email })
          } catch (e) {
            console.error('[Google] JWT decode error:', e)
          }
        },
      })
      const width = outerRef.current?.offsetWidth || 360
      window.google.accounts.id.renderButton(overlayRef.current, {
        theme: 'filled_black',
        size: 'large',
        width,
        text: 'signin_with',
        locale: 'ru',
        shape: 'rectangular',
      })
    }
    if (window.google) init()
    else {
      const t = setInterval(() => { if (window.google) { init(); clearInterval(t) } }, 200)
      return () => clearInterval(t)
    }
  }, [])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div ref={outerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Наша кнопка — только визуал */}
      <button className="login-google-btn" tabIndex={-1} style={{ pointerEvents: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Войти через Google
      </button>
      {/* Прозрачная Google-кнопка поверх — перехватывает клики */}
      <div
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, opacity: 0, overflow: 'hidden', cursor: 'pointer' }}
      />
    </div>
  )
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
