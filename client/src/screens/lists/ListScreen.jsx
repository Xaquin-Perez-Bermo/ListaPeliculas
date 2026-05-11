import { useState, useEffect } from 'react'
import { RandomRouletteModal } from '../RandomRouletteModal'
import MovieCard from '../../components/movieList/MovieListCard'
import MovieListCard from '../../components/movieList/MovieListCard'

export function ListScreen({
  movies,
  listName,
  statusFilter,
  setStatusFilter,
  showVetoConfig,
  setShowVetoConfig,
  groupedGenreVetoes,
  currentUsername,
  onToggleGenreVeto,
  onToggleMovieVeto,
  t,
  tGenre,
  onOpenDetail,
}) {
  const [showRoulette, setShowRoulette] = useState(false)
  const [selectedGenres, setSelectedGenres] = useState(() => {
    // Cargar géneros seleccionados desde localStorage
    const saved = localStorage.getItem('selectedGenres')
    return saved ? JSON.parse(saved) : []
  })

  // Guardar selectedGenres en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('selectedGenres', JSON.stringify(selectedGenres))
  }, [selectedGenres])

  const availableGenres = [...new Set(movies.flatMap((movie) => movie.genres || []))].sort(
    (a, b) => a.localeCompare(b),
  )

  const filteredMovies = movies.filter((movie) => {
    if (!selectedGenres.length) return true
    return selectedGenres.some((genre) => movie.genres.includes(genre))
  })

  const toggleGenreFilter = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre],
    )
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{listName}</h2>
        <div className="inline">
          <button onClick={() => setShowRoulette(true)}>{t('randomPickButton')}</button>
          <button
            className="ghost"
            onClick={() => setShowVetoConfig((prev) => !prev)}
          >
            {showVetoConfig ? t('hideVetoConfig') : t('showVetoConfig')}
          </button>
        </div>
      </div>

      {showVetoConfig ? (
        <div className="veto-config">
          <h3>{t('genreVetoTitle')}</h3>
          <p className="muted small">
            {t('genreVetoDescription')}
          </p>

          <div className="chip-row genre-veto-chips">
            {availableGenres.length === 0 ? (
              <p className="muted small">{t('genreVetoNoGenres')}</p>
            ) : (
              availableGenres.map((genre) => {
                const users = groupedGenreVetoes[genre] || []
                const hasMyVeto = users.includes(currentUsername)

                return (
                  <button
                    key={genre}
                    type="button"
                    className={`chip genre-chip-toggle ${hasMyVeto ? 'active' : ''}`}
                    onClick={() => onToggleGenreVeto(genre, hasMyVeto)}
                    title={hasMyVeto ? t('removeMyVeto') : t('addGenreVeto')}
                  >
                    {tGenre(genre)}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}

      <div className="filters">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">{t('filterAll')}</option>
          <option value="active">{t('filterEligible')}</option>
          <option value="vetoed">{t('filterVetoed')}</option>
        </select>
      </div>

      <div className="genre-filter-list">
        <p className="muted small">{t('filterByGenre')}</p>
        <div className="chip-row">
          {availableGenres.length === 0 ? (
            <p className="muted small">{t('genreFilterNoGenres')}</p>
          ) : (
            availableGenres.map((genre) => {
              const isChecked = selectedGenres.includes(genre)
              return (
                <label key={`filter-${genre}`} className={`genre-filter-item ${isChecked ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleGenreFilter(genre)}
                  />
                  <span>{tGenre(genre)}</span>
                </label>
              )
            })
          )}
        </div>
      </div>

      {showRoulette ? (
        <RandomRouletteModal
          movies={filteredMovies}
          t={t}
          onClose={() => setShowRoulette(false)}
          onOpenDetail={(movieId) => {
            onOpenDetail(movieId)
            setShowRoulette(false)
          }}
        />
      ) : null}

      {/* Lista de películas */}
      <ul className="result-list">
        {filteredMovies.map((movie) => (
          <MovieListCard
            key={movie.externalId}
            movie={movie}
            currentUsername={currentUsername}
            t={t}
            tGenre={tGenre}
            onOpenDetail={onOpenDetail}
            onToggleMovieVeto={onToggleMovieVeto}
          />
        ))}
      </ul>
    </section>
  )
}
