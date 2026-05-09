/**
 * SharedListScreen - Pantalla de lista conjunta
 */
/* eslint-disable react/prop-types */
import { useState } from 'react'
import { RandomRouletteModal } from './RandomRouletteModal'

// eslint-disable-next-line react/prop-types
export function SharedListScreen({
  movies,
  statusFilter,
  setStatusFilter,
  showVetoConfig,
  setShowVetoConfig,
  groupedGenreVetoes,
  currentUsername,
  onToggleGenreVeto,
  onToggleMovieVeto,
  t,
  onOpenDetail,
}) {
  const [showRoulette, setShowRoulette] = useState(false)
  const [selectedGenres, setSelectedGenres] = useState([])

  const genreKeyMap = {
    Action: 'genreAction',
    Adventure: 'genreAdventure',
    Animation: 'genreAnimation',
    Biography: 'genreBiography',
    Comedy: 'genreComedy',
    Crime: 'genreCrime',
    Documentary: 'genreDocumentary',
    Drama: 'genreDrama',
    Family: 'genreFamily',
    Fantasy: 'genreFantasy',
    History: 'genreHistory',
    Horror: 'genreHorror',
    Music: 'genreMusic',
    Musical: 'genreMusical',
    Mystery: 'genreMystery',
    Romance: 'genreRomance',
    'Sci-Fi': 'genreSciFi',
    Thriller: 'genreThriller',
    War: 'genreWar',
    Western: 'genreWestern',
  }

  const getGenreLabel = (genre) => {
    const key = genreKeyMap[genre]
    return key ? t(key) : genre
  }

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
        <h2>{t('tabShared')}</h2>
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
                    {getGenreLabel(genre)}
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
                  <span>{getGenreLabel(genre)}</span>
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

      <ul className="result-list">
        {filteredMovies.map((movie) => (
          <li key={movie.id} className="movie-card">
            <div className="movie-main">
              <strong>
                {movie.title} {movie.year ? `(${movie.year})` : `(${t('naLabel')})`}
              </strong>
              <div className="chip-row">
                {movie.genres.map((genre) => (
                  <span key={`${movie.id}-${genre}`} className="chip">
                    {getGenreLabel(genre)}
                  </span>
                ))}
              </div>
              <p className="muted">
                {t('addedByLabel')} {movie.createdBy} | {t('avgRatingLabel')} {movie.avgRating || t('naLabel')}
              </p>
              {movie.isVetoed ? (
                <p className="error small">
                  {t('vetoedStatus')} {movie.vetoedBy.length ? `${t('byLabel')} ${movie.vetoedBy.join(', ')}` : ''}
                </p>
              ) : (
                <p className="success small">{t('eligibleStatus')}</p>
              )}
            </div>

            <div className="movie-actions">
              <button onClick={() => onOpenDetail(movie.id)}>{t('viewDetailButton')}</button>
              <button onClick={() => onToggleMovieVeto(movie)}>
                {(movie.vetoedBy || []).includes(currentUsername)
                  ? t('removeVetoButton')
                  : t('addVetoButton')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
