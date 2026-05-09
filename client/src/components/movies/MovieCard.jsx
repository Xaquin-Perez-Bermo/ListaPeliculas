import React from 'react'

const MovieCard = ({ movie, currentUsername, t, onOpenDetail, onToggleMovieVeto, getGenreLabel }) => {
  return (
    <>
      <li key={movie.id} className="movie-card" onClick={() => onOpenDetail(movie.id)} style={{ cursor: 'pointer' }}>
        <div className="movie-main">
          <strong className={movie.myRating ? 'watched-title' : ''}>
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
          <button
            className={(movie.vetoedBy || []).includes(currentUsername) ? '' : 'destructive_button'}
            onClick={(e) => { e.stopPropagation(); onToggleMovieVeto(movie); }}
          >
            {(movie.vetoedBy || []).includes(currentUsername)
              ? t('removeVetoButton')
              : t('addVetoButton')}
          </button>
        </div>
      </li>
    </>
  )
}

export default MovieCard
