/**
 * MovieDetailScreen - Pantalla de detalle de película
 */
/* eslint-disable react/prop-types */
// eslint-disable-next-line react/prop-types
export function MovieDetailScreen({
  selectedMovie,
  detailRatings,
  ratingState,
  onRatingChange,
  onSaveRating,
  onClearWatched,
  t,
}) {
  if (!selectedMovie) {
    return (
      <section className="panel">
        <p className="muted">
          {t('detailEmptyState')}
        </p>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>
          {selectedMovie.title} {selectedMovie.year ? `(${selectedMovie.year})` : ''}
        </h2>
      </div>

      <div className="chip-row">
        {selectedMovie.genres.map((genre) => (
          <span key={`${selectedMovie.id}-detail-${genre}`} className="chip">
            {genre}
          </span>
        ))}
      </div>

      <p className="muted">
        {selectedMovie.overview || t('detailNoOverview')}
      </p>

      <div className="inline rating-row">
        <span>{t('detailSeenOn')}</span>
        <input
          type="date"
          value={ratingState.watchedOn}
          onChange={(event) =>
            onRatingChange({
              watchedOn: event.target.value,
            })
          }
        />
        <span>{t('detailRating')}</span>
        <input
          type="number"
          min="0.5"
          max="5"
          step="0.5"
          value={ratingState.rating}
          onChange={(event) =>
            onRatingChange({
              rating: Number(event.target.value),
            })
          }
        />
        <button onClick={() => onSaveRating(selectedMovie.id)}>
          {t('detailSaveRating')}
        </button>
        <button className="ghost" onClick={() => onClearWatched(selectedMovie.id)}>
          {t('detailMarkUnwatched')}
        </button>
      </div>

      <h3>{t('detailRatingsHistory')}</h3>
      <ul className="result-list">
        {detailRatings.length ? (
          detailRatings.map((rating, index) => (
            <li
              key={`${rating.username}-${rating.updatedAt}-${index}`}
              className="movie-card compact"
            >
              <div className="movie-main">
                <strong>{rating.username}</strong>
                <p>
                  {rating.rating} / 5 | {t('detailSeenOn')} {rating.watchedOn}
                </p>
              </div>
            </li>
          ))
        ) : (
          <li className="muted">{t('detailNoRatings')}</li>
        )}
      </ul>
    </section>
  )
}
