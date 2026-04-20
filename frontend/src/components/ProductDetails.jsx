function plainToHtml(text) {
  const lines = text.split(/\r?\n/)
  let html = ''
  let inList = false
  for (const line of lines) {
    const trimmed = line.trim()
    const numbered = trimmed.match(/^(\d+)\.\s+(.+)/)
    if (numbered) {
      if (!inList) { html += '<ol>'; inList = true }
      html += `<li>${numbered[2]}</li>`
    } else {
      if (inList) { html += '</ol>'; inList = false }
      if (trimmed === '') continue
      if (trimmed.endsWith(':') && trimmed.length < 80) {
        html += `<p><strong>${trimmed}</strong></p>`
      } else {
        html += `<p>${trimmed}</p>`
      }
    }
  }
  if (inList) html += '</ol>'
  return html
}

function DescriptionBlock({ text }) {
  if (!text) return null
  const isHtml = /<[a-z][\s\S]*>/i.test(text)
  const html = isHtml ? text : plainToHtml(text)
  return (
    <div
      className="details-description"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function ProductDetails({ product, onBack, onAddToCart, onCheckout, userEmail, isLoggedIn }) {
  if (!product) return null

  return (
    <section className="details-page">

      <div className="details-top-bar">
        <button className="btn-tertiary details-back-btn" onClick={onBack}>← Назад</button>
        <div className="details-top-actions">
          <button className="btn-secondary" onClick={() => onAddToCart(product)}>В корзину</button>
          <button className="btn-primary" onClick={() => onCheckout(product)}>Оформить сейчас</button>
        </div>
      </div>

      <div className="details-grid">
        <div className="details-card">
          <span className="hero-tag">{product.category}</span>
          <h2>{product.title}</h2>
          <p className="card-meta">Платформа: {product.platform} · Регион: {product.region}</p>
          <DescriptionBlock text={product.description} />
          <div className="details-info">
            <div>
              <span className="label">Сервис</span>
              <p>{product.service}</p>
            </div>
            <div>
              <span className="label">Цена</span>
              <p>₽{product.price.toLocaleString('ru-RU')}</p>
            </div>
            <div>
              <span className="label">Адрес доставки</span>
              <p>{userEmail || 'Email не указан'}</p>
            </div>
          </div>
        </div>
        <div className="details-panel">
          <h3>Что будет дальше</h3>
          <ul>
            <li>Вы сохраняете корзину при входе через email</li>
            <li>Код приходит на экран сразу после оплаты</li>
            <li>Код копируется одним кликом</li>
            <li>Также код отправляется на почту</li>
          </ul>
        </div>
      </div>

    </section>
  )
}

export default ProductDetails
