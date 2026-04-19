function ProductDetails({ product, onBack, onAddToCart, onCheckout, userEmail, isLoggedIn }) {
  if (!product) return null

  return (
    <section className="details-page">
      <div className="details-grid">
        <div className="details-card">
          <span className="hero-tag">{product.category}</span>
          <h2>{product.title}</h2>
          <p className="card-meta">Платформа: {product.platform} · Регион: {product.region}</p>
          <p className="details-description">{product.description}</p>
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

      <div className="details-bottom-bar">
        <button className="btn-tertiary details-back-btn" onClick={onBack}>← Назад</button>
        <div className="details-bottom-actions">
          <button className="btn-secondary" onClick={() => onAddToCart(product)}>
            В корзину
          </button>
          <button className="btn-primary" onClick={() => onCheckout(product)}>
            Оформить сейчас
          </button>
        </div>
      </div>
    </section>
  )
}

export default ProductDetails
