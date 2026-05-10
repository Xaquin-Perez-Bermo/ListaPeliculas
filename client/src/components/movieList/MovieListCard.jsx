import MovieCard from "../general/MovieCard";

const MovieListCard = ({ movie, currentUsername, t, tGenre, onOpenDetail, onToggleMovieVeto }) => {
  return (
    <>
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
      </MovieCard>
    </>
  )
}

export default MovieListCard
