import MovieCard from "../general/MovieCard";
import PropTypes from 'prop-types'

const MovieListCard = ({
  movie,
  currentUsername,
  t,
  tGenre,
  onOpenDetail,
  onToggleMovieVeto,
  onMarkWatched,
  canVeto = true,
}) => {
  return (
    <MovieCard
      key={movie.id}
      movie={movie}
      currentUsername={currentUsername}
      t={t}
      tGenre={tGenre}
      onOpenDetail={onOpenDetail}
      onToggleMovieVeto={onToggleMovieVeto}
    >
      <div>
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

        {movie.myRating ? (
          <p className="small watched-pill">
            {t('detailSeenOn')}: {movie.myWatchedOn || '-'} • {t('detailRating')}: {movie.myRating}
          </p>
        ) : (
          <p className="small muted">{t('notWatchedYet')}</p>
        )}
      </div>

      <div className="movie-actions">
        <button
          type="button"
          className="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onMarkWatched(movie)
          }}
        >
          {t('markWatchedButton')}
        </button>

        {canVeto ? (
          <button
            className={(movie.vetoedBy || []).includes(currentUsername) ? '' : 'destructive_button'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleMovieVeto(movie)
            }}
          >
            {(movie.vetoedBy || []).includes(currentUsername)
              ? t('removeVetoButton')
              : t('addVetoButton')}
          </button>
        ) : null}
      </div>
    </MovieCard>
  )
}

MovieListCard.propTypes = {
  movie: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    createdBy: PropTypes.string,
    avgRating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    isVetoed: PropTypes.bool,
    vetoedBy: PropTypes.arrayOf(PropTypes.string),
    myRating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    myWatchedOn: PropTypes.string,
  }).isRequired,
  currentUsername: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
  tGenre: PropTypes.func.isRequired,
  onOpenDetail: PropTypes.func.isRequired,
  onToggleMovieVeto: PropTypes.func.isRequired,
  onMarkWatched: PropTypes.func.isRequired,
  canVeto: PropTypes.bool,
}

MovieListCard.defaultProps = {
  canVeto: true,
}

export default MovieListCard
