function ProductCard({ product, onSelect, onAdd, showBadge = false }) {
  return (
    <article
      className="card product-card product-card--clickable"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
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
            <button
              className="btn-primary btn-sm"
              onClick={e => { e.stopPropagation(); onAdd() }}
            >
              Купить
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default ProductCard
