import { useState, useEffect, useCallback } from 'react'
import GameCard from './GameCard'

const PER_PAGE = 24

function GamesSection({ onSelectGame }) {
  const [launchers, setLaunchers] = useState([])
  const [activeLauncher, setActiveLauncher] = useState('')
  const [search, setSearch] = useState('')
  const [games, setGames] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/games/meta')
      .then(r => r.json())
      .then(d => setLaunchers(d.launchers || []))
      .catch(() => {})
  }, [])

  const load = useCallback(async (launcher, search, currentOffset, append) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: PER_PAGE, offset: currentOffset })
      if (launcher) params.set('launcher', launcher)
      if (search) params.set('search', search)
      const res = await fetch(`/api/games?${params}`)
      const data = await res.json()
      if (append) {
        setGames(prev => [...prev, ...(data.games || [])])
      } else {
        setGames(data.games || [])
      }
      setTotal(data.total || 0)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    setOffset(0)
    load(activeLauncher, search, 0, false)
  }, [activeLauncher, search, load])

  function loadMore() {
    const next = offset + PER_PAGE
    setOffset(next)
    load(activeLauncher, search, next, true)
  }

  return (
    <section className="games-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Игры</p>
          <h2>Купить игры</h2>
        </div>
      </div>

      <div className="games-filters">
        {launchers.length > 0 && (
          <div className="games-launcher-tabs">
            <button
              className={`launcher-tab${activeLauncher === '' ? ' active' : ''}`}
              onClick={() => setActiveLauncher('')}
            >
              Все
            </button>
            {launchers.map(l => (
              <button
                key={l}
                className={`launcher-tab${activeLauncher === l ? ' active' : ''}`}
                onClick={() => setActiveLauncher(l)}
              >
                {l}
              </button>
            ))}
          </div>
        )}
        <div className="search-wrap" style={{ maxWidth: 340 }}>
          <input
            type="text"
            className="search-input games-search"
            placeholder="Поиск по названию игры..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>×</button>
          )}
        </div>
      </div>

      {loading && games.length === 0 ? (
        <div className="games-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="game-card game-card--skeleton" />
          ))}
        </div>
      ) : games.length > 0 ? (
        <>
          <div className="games-grid">
            {games.map(game => (
              <GameCard key={game.id} game={game} onSelect={() => onSelectGame(game)} />
            ))}
          </div>
          {games.length < total && (
            <div className="games-load-more">
              <button className="btn-secondary" onClick={loadMore} disabled={loading}>
                {loading ? 'Загрузка...' : `Показать ещё (${total - games.length})`}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="empty-state">Игры не найдены</p>
      )}
    </section>
  )
}

export default GamesSection
