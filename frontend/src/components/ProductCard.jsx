function ProductCard({ product, onSelect, onAdd, showBadge = false }) {
  return (
    <article className="card product-card">
      {showBadge && <div className="card-badge">{product.badge}</div>}
      <div className="card-body">
        <div className="card-title-group">
          <h3>{product.title}</h3>
          <span className="card-price">₽{product.price.toLocaleString('ru-RU')}</span>
        </div>
        <p className="card-meta">{product.category} · {product.platform}</p>
        <p className="card-description">{product.description}</p>
        <div className="card-footer">
          <span className="card-region">Регион: {product.region}</span>
          <div className="card-actions">
            <button className="btn-tertiary btn-sm" onClick={onSelect}>Подробнее</button>
            <button className="btn-primary btn-sm" onClick={onAdd}>Купить</button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default ProductCard
