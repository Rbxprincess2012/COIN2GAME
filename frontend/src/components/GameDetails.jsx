function GameDetails({ game, onBack, onAddToCart, onCheckout }) {
  if (!game) return null

  const year = game.release_date ? new Date(game.release_date).getFullYear() : null

  return (
    <section className="game-details-page">
      <div
        className="game-details-hero"
        style={game.image ? { backgroundImage: `url(${game.image})` } : {}}
      >
        <div className="game-details-hero-overlay">
          <button className="btn-tertiary back-btn" onClick={onBack}>← Назад</button>
        </div>
      </div>

      <div className="game-details-body">
        <div className="game-details-main">
          <div className="game-details-badges">
            {game.launcher && <span className="game-launcher-badge">{game.launcher}</span>}
            {game.age_rating && <span className="game-age-badge">{game.age_rating}+</span>}
          </div>

          <h1 className="game-details-title">{game.title}</h1>

          {game.genres && <p className="game-genres game-genres--lg">{game.genres}</p>}

          <div className="game-info-grid">
            {game.developer && (
              <div className="game-info-item">
                <span className="label">Разработчик</span>
                <p>{game.developer}</p>
              </div>
            )}
            {year && (
              <div className="game-info-item">
                <span className="label">Год выхода</span>
                <p>{year}</p>
              </div>
            )}
            {game.supported_platforms && (
              <div className="game-info-item">
                <span className="label">Платформа</span>
                <p>{game.supported_platforms}</p>
              </div>
            )}
            <div className="game-info-item">
              <span className="label">Регион активации</span>
              <p>{game.region}</p>
            </div>
          </div>

          {game.languages?.length > 0 && (
            <div className="game-languages">
              <p className="label">Языки</p>
              <div className="game-lang-list">
                {game.languages.map(l => (
                  <span
                    key={l.language}
                    className={`game-lang-badge${l.hasInterface ? ' has-interface' : ''}`}
                    title={[l.hasInterface && 'Интерфейс', l.hasFullAudio && 'Звук', l.hasSubtitles && 'Субтитры'].filter(Boolean).join(', ')}
                  >
                    {l.language}
                  </span>
                ))}
              </div>
            </div>
          )}

          {game.description && (
            <div
              className="game-description"
              dangerouslySetInnerHTML={{ __html: game.description }}
            />
          )}
        </div>

        <div className="game-details-sidebar">
          {game.image && (
            <img
              src={game.image}
              alt={game.title}
              className="game-sidebar-cover"
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <div className="game-purchase-box">
            <div className="game-purchase-price">₽{game.price?.toLocaleString('ru-RU')}</div>
            <p className="checkout-meta">Регион: {game.region}</p>
            <button className="btn-primary checkout-btn" onClick={() => onCheckout(game)}>
              Купить сейчас
            </button>
            <button className="btn-secondary checkout-btn" onClick={() => onAddToCart(game)}>
              В корзину
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GameDetails
