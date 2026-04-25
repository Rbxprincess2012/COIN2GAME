import { motion } from 'framer-motion'

function ProductCard({ product, onSelect, onAdd, showBadge = false }) {
  return (
    <motion.article
      className="card product-card product-card--clickable"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: '0 8px 32px rgba(134,95,255,0.18)' }}
      whileTap={{ scale: 0.98 }}
    >
      {showBadge && product.badge && (
        <div className="card-badge">{product.badge}</div>
      )}
      <div className="card-body">
        <div className="card-title-group">
          <h3>{product.title}</h3>
          <span className="card-price">₽{product.price.toLocaleString('ru-RU')}</span>
        </div>
        <p className="card-meta">{product.category} · {product.platform}</p>
        <div className="card-footer">
          <span className="card-region">Регион: {product.region}</span>
          <div className="card-actions">
            <motion.button
              className="btn-primary btn-sm"
              onClick={e => { e.stopPropagation(); onAdd() }}
              whileTap={{ scale: 0.92 }}
            >
              Купить
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export default ProductCard
