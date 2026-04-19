function CartPanel({ visible, cart, onClose, onRemove, onCheckout }) {
  if (!visible) return null

  return (
    <aside className="cart-panel">
      <div className="cart-header">
        <h3>Корзина {cart.length > 0 ? `(${cart.length})` : ''}</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {cart.length === 0 ? (
        <div className="cart-empty">
          <p>Корзина пуста</p>
          <p className="cart-empty-sub">Добавьте товары из каталога</p>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div>
                  <p className="cart-item-title">{item.title}</p>
                  <p className="cart-item-meta">{item.platform} · {item.region}</p>
                </div>
                <div className="cart-item-actions">
                  <span>₽{item.price.toLocaleString('ru-RU')}</span>
                  <button className="btn-tertiary btn-sm" onClick={() => onRemove(item.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-footer">
            <p>Итого: <strong>₽{cart.reduce((sum, item) => sum + item.price, 0).toLocaleString('ru-RU')}</strong></p>
            <button className="btn-primary" onClick={onCheckout}>Оформить заказ</button>
          </div>
        </>
      )}
    </aside>
  )
}

export default CartPanel
