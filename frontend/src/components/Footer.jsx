import { useState } from 'react'

const SUPPORT_EMAIL = 'info@coin2game.space'

function SupportContact() {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(SUPPORT_EMAIL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="support-contact">
      <span className="support-label">Служба поддержки</span>
      <div className="support-email-row">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="support-email">{SUPPORT_EMAIL}</a>
        <button className="support-copy-btn" onClick={handleCopy} title="Скопировать email">
          {copied ? '✓' : '⎘'}
        </button>
      </div>
      <span className="support-hint">Ответим в течение 24 часов</span>
    </div>
  )
}

function Footer() {
  return (
    <footer className="site-footer">

      <section className="how-section" id="how">
        <h2 className="section-title">Как купить</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <h3>Выберите товар</h3>
            <p>Найдите нужную игру или сервис через поиск или фильтры по платформе.</p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <h3>Войдите по email</h3>
            <p>Введите email и 4-значный код подтверждения — быстро и без пароля.</p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <h3>Оплатите заказ</h3>
            <p>Банковская карта, Crypto или СБП — выберите удобный способ.</p>
          </div>
          <div className="step-card">
            <div className="step-num">4</div>
            <h3>Получите код</h3>
            <p>Код отображается на экране сразу и отправляется на email — скопируйте одним кликом.</p>
          </div>
        </div>
      </section>

      <section className="faq-section" id="support">
        <h2 className="section-title">Частые вопросы</h2>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Как быстро я получу код после оплаты?</summary>
            <p>Мгновенно — код появится на экране сразу после успешной оплаты, и одновременно придёт на ваш email.</p>
          </details>
          <details className="faq-item">
            <summary>Нужна ли регистрация для покупки?</summary>
            <p>Нет. Вы можете купить без регистрации, но вход по email позволяет сохранить корзину и историю заказов.</p>
          </details>
          <details className="faq-item">
            <summary>Для какого региона коды?</summary>
            <p>Регион указан в карточке каждого товара. Убедитесь, что регион совпадает с вашим аккаунтом перед покупкой.</p>
          </details>
          <details className="faq-item">
            <summary>Что делать, если код не подходит?</summary>
            <p>Напишите в поддержку — мы поможем разобраться в течение 24 часов и при необходимости заменим код.</p>
          </details>
          <details className="faq-item">
            <summary>Какие способы оплаты принимаете?</summary>
            <p>Банковские карты (Visa, MasterCard, МИР), криптовалюта и СБП.</p>
          </details>
        </div>

        <SupportContact />
      </section>

      <div className="footer-bottom">
        <div className="footer-brand-block">
          <div className="footer-brand">
            COIN<span className="footer-brand-accent">2</span>GAME
          </div>
          <p className="footer-copy">© 2025 Цифровые коды с мгновенной доставкой.</p>
        </div>

        <nav className="footer-nav">
          <a href="#platforms" className="footer-nav-link">Каталог</a>
          <a href="#how" className="footer-nav-link">Как купить</a>
          <a href="#support" className="footer-nav-link">Поддержка</a>
        </nav>
      </div>

    </footer>
  )
}

export default Footer
