import { motion, AnimatePresence } from 'framer-motion'

function CartPanel({ visible, cart, onClose, onRemove, onCheckout }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          className="cart-panel"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
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
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.div
                      key={item.cartKey || item.id}
                      className="cart-item"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div>
                        <p className="cart-item-title">{item.title}</p>
                        <p className="cart-item-meta">{item.platform} · {item.region}</p>
                      </div>
                      <div className="cart-item-actions">
                        <span>₽{item.price.toLocaleString('ru-RU')}</span>
                        <button className="btn-tertiary btn-sm" onClick={() => onRemove(item.cartKey || item.id)}>×</button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="cart-footer">
                <p>Итого: <strong>₽{cart.reduce((sum, item) => sum + item.price, 0).toLocaleString('ru-RU')}</strong></p>
                <button className="btn-primary" onClick={onCheckout}>Оформить заказ</button>
              </div>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default CartPanel
