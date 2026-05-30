/**
 * WatchedMoviesScreen - Pantalla de películas vistas
 */
import PropTypes from 'prop-types'
import MovieCard from '../components/movieList/MovieListCard'
import { WatchedGenresTimelineChart } from '../components/general/WatchedGenresTimelineChart'

export function WatchedMoviesScreen({
  movies,
  currentUsername,
  t,
  tGenre,
  onOpenDetail,
}) {
  // Filtrar películas vistas (que tienen myRating)
  const watchedMovies = movies.filter(movie => movie.myRating)

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{t('watchedMoviesTitle')}</h2>
        <p className="muted">{t('watchedMoviesSubtitle', { count: watchedMovies.length })}</p>
      </div>

      <WatchedGenresTimelineChart watchedMovies={watchedMovies} t={t} tGenre={tGenre} />

      <ul className="result-list">
        {watchedMovies.length ? (
          watchedMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              currentUsername={currentUsername}
              t={t}
              tGenre={tGenre}
              onOpenDetail={onOpenDetail}
              onToggleMovieVeto={() => {}} // No veto en esta pantalla
            />
          ))
        ) : (
          <li className="muted">{t('noWatchedMovies')}</li>
        )}
      </ul>
    </section>
  )
}

WatchedMoviesScreen.propTypes = {
  movies: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUsername: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
  tGenre: PropTypes.func.isRequired,
  onOpenDetail: PropTypes.func.isRequired,
}