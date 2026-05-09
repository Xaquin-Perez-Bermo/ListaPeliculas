/**
 * WatchedMoviesScreen - Pantalla de películas vistas
 */
/* eslint-disable react/prop-types */
import MovieCard from '../components/movies/MovieCard'

// eslint-disable-next-line react/prop-types
export function WatchedMoviesScreen({
  movies,
  currentUsername,
  t,
  onOpenDetail,
  getGenreLabel,
}) {
  // Filtrar películas vistas (que tienen myRating)
  const watchedMovies = movies.filter(movie => movie.myRating)

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{t('watchedMoviesTitle')}</h2>
        <p className="muted">{t('watchedMoviesSubtitle', { count: watchedMovies.length })}</p>
      </div>

      <ul className="result-list">
        {watchedMovies.length ? (
          watchedMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              currentUsername={currentUsername}
              t={t}
              onOpenDetail={onOpenDetail}
              onToggleMovieVeto={() => {}} // No veto en esta pantalla
              getGenreLabel={getGenreLabel}
            />
          ))
        ) : (
          <li className="muted">{t('noWatchedMovies')}</li>
        )}
      </ul>
    </section>
  )
}