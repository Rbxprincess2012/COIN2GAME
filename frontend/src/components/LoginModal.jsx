import { useEffect, useState } from 'react'

function LoginModal({ visible, initialEmail, onClose, onSendCode, onVerifyCode, codeSent }) {
  const [email, setEmail] = useState(initialEmail || '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')

  useEffect(() => {
    setEmail(initialEmail || '')
    setCode('')
    setStep(codeSent ? 'verify' : 'email')
  }, [initialEmail, codeSent])

  if (!visible) return null

  const sendCode = async () => {
    await onSendCode(email)
    setStep('verify')
  }

  const verifyCode = async () => {
    await onVerifyCode(code)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Вход в аккаунт</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <p className="modal-description">Введите email, чтобы получить код подтверждения. Сохранится корзина и история заказа.</p>

        <div className="auth-actions">
          <button className="btn-google" onClick={() => alert('Google login placeholder')}>
            Войти через Google
          </button>
        </div>

        {step === 'email' && (
          <div className="auth-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@example.com"
              />
            </label>
            <button className="btn-primary" onClick={sendCode} disabled={!email}>
              Получить код
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="auth-form">
            <p className="info-text">Код отправлен на {email}. Введите 4-значный код.</p>
            <label>
              Код
              <input
                type="text"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
              />
            </label>
            <button className="btn-primary" onClick={verifyCode} disabled={code.length !== 4}>
              Подтвердить код
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginModal
