import { useEffect, useRef, useState } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function GoogleButton({ onLogin }) {
  const containerRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const init = () => {
      if (!window.google || !containerRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => {
          try {
            // base64url → base64 (Google JWT uses url-safe encoding)
            const b64 = res.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
            const padded = b64 + '='.repeat((4 - b64.length % 4) % 4)
            const payload = JSON.parse(atob(padded))
            if (payload.email) onLogin({ email: payload.email, name: payload.name || payload.email })
          } catch (e) {
            console.error('[Google] JWT decode error:', e)
          }
        },
      })
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: 360,
        text: 'signin_with',
        locale: 'ru',
      })
      setReady(true)
    }
    if (window.google) init()
    else {
      const t = setInterval(() => { if (window.google) { init(); clearInterval(t) } }, 200)
      return () => clearInterval(t)
    }
  }, [])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div style={{ position: 'relative', height: 48, borderRadius: 14, overflow: 'hidden' }}>
      {/* Наша кнопка — только визуал */}
      <div className="login-google-btn" style={{ pointerEvents: 'none', height: '100%', borderRadius: 0 }}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
        </svg>
        Войти через Google
      </div>
      {/* Реальная Google кнопка — прозрачная поверх */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute', inset: 0,
          opacity: ready ? 0.01 : 0,
          overflow: 'hidden',
        }}
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
