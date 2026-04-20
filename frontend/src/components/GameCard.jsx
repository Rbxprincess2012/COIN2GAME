function GameCard({ game, onSelect }) {
  return (
    <article className="game-card" onClick={onSelect}>
      <div className="game-card-cover-wrap">
        {game.image
          ? <img src={game.image} alt={game.title} className="game-card-cover" onError={e => { e.target.style.display = 'none' }} />
          : <div className="game-card-cover game-card-cover--empty" />
        }
        <span className="game-launcher-badge">{game.launcher}</span>
      </div>
      <div className="game-card-body">
        <h3 className="game-card-title">{game.title}</h3>
        {game.genres && <p className="game-genres">{game.genres}</p>}
        <div className="game-card-footer">
          <span className="card-region">🌍 {game.region}</span>
          <span className="card-price">₽{game.price?.toLocaleString('ru-RU')}</span>
        </div>
      </div>
    </article>
  )
}

export default GameCard
