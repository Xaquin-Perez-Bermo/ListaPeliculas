import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { RandomRouletteModal } from '../RandomRouletteModal'
import MovieListCard from '../../components/movieList/MovieListCard'
import MarkWatchedModal from '../../components/general/MarkWatchedModal'

export function ListScreen({
  movies,
  isLoading,
  listName,
  statusFilter,
  setStatusFilter,
  showVetoConfig,
  setShowVetoConfig,
  groupedGenreVetoes,
  currentUsername,
  onToggleGenreVeto,
  onToggleMovieVeto,
  canConfigureVeto,
  onBackToLists,
  onMarkWatched,
  t,
  tGenre,
  onOpenDetail,
  inviteCode,
  visibility,
  isOwner,
}) {
  const [showRoulette, setShowRoulette] = useState(false)
  const [watchTargetMovie, setWatchTargetMovie] = useState(null)
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

  const filteredMovies = movies
    .filter((movie) => {
      if (statusFilter === 'active') return !movie.isVetoed
      if (statusFilter === 'vetoed') return movie.isVetoed
      return true
    })
    .filter((movie) => {
      if (!selectedGenres.length) return true
      return selectedGenres.some((genre) => movie.genres.includes(genre))
    })

  const toggleGenreFilter = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre],
    )
  }

  // Copiar enlace privado al portapapeles
  const handleCopyInviteLink = () => {
    if (!inviteCode) return
    const url = `${globalThis.location.origin}/invite/${inviteCode}`
    navigator.clipboard.writeText(url)
      .then(() => alert(t('privateInviteLinkCopied') || '¡Enlace copiado!'))
      .catch(() => alert('No se pudo copiar el enlace'))
  }

  return (
    <section className="panel">
      <div className="list-breadcrumbs">
        <button type="button" className="ghost" onClick={onBackToLists}>{t('lists')}</button>
        <span>/</span>
        <strong>{listName}</strong>
      </div>
      {/* Botón para generar enlace privado */}
      {visibility === 'private' && isOwner && inviteCode && (
        <div style={{ margin: '12px 0' }}>
          <button type="button" onClick={handleCopyInviteLink}>
            {t('generateInviteLinkButton') || 'Generar enlace'}
          </button>
        </div>
      )}

      <div className="panel-head">
        <h2>{listName}</h2>
        <div className="inline">
          <button onClick={() => setShowRoulette(true)}>{t('randomPickButton')}</button>
          {canConfigureVeto ? (
            <button
              className="ghost"
              onClick={() => setShowVetoConfig((prev) => !prev)}
            >
              {showVetoConfig ? t('hideVetoConfig') : t('showVetoConfig')}
            </button>
          ) : (
            <p className="muted small">{t('listVetoDisabled')}</p>
          )}
        </div>
      </div>

      {showVetoConfig && canConfigureVeto ? (
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

      {isLoading ? <p className="muted">{t('loadingLists')}</p> : null}

      {showRoulette ? (
        <RandomRouletteModal
          movies={filteredMovies}
          t={t}
          onClose={() => setShowRoulette(false)}
          onOpenDetail={(movie) => {
            onOpenDetail(movie)
            setShowRoulette(false)
          }}
        />
      ) : null}

      {watchTargetMovie ? (
        <MarkWatchedModal
          movie={watchTargetMovie}
          onClose={() => setWatchTargetMovie(null)}
          onSave={onMarkWatched}
          t={t}
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
            onMarkWatched={(movie) => setWatchTargetMovie(movie)}
            canVeto={canConfigureVeto}
          />
        ))}
      </ul>
    </section>
  )
}

ListScreen.propTypes = {
  movies: PropTypes.arrayOf(PropTypes.object).isRequired,
  isLoading: PropTypes.bool,
  listName: PropTypes.string,
  statusFilter: PropTypes.string.isRequired,
  setStatusFilter: PropTypes.func.isRequired,
  showVetoConfig: PropTypes.bool.isRequired,
  setShowVetoConfig: PropTypes.func.isRequired,
  groupedGenreVetoes: PropTypes.object.isRequired,
  currentUsername: PropTypes.string.isRequired,
  onToggleGenreVeto: PropTypes.func.isRequired,
  onToggleMovieVeto: PropTypes.func.isRequired,
  canConfigureVeto: PropTypes.bool,
  onBackToLists: PropTypes.func.isRequired,
  onMarkWatched: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  tGenre: PropTypes.func.isRequired,
  onOpenDetail: PropTypes.func.isRequired,
  inviteCode: PropTypes.string,
  visibility: PropTypes.string,
  isOwner: PropTypes.bool,
}

ListScreen.defaultProps = {
  listName: '',
  isLoading: false,
  canConfigureVeto: true,
  inviteCode: '',
  visibility: '',
  isOwner: false,
}
