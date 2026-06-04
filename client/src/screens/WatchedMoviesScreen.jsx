/**
 * WatchedMoviesScreen - Pantalla de películas vistas con gráficos y detalles
 */
import PropTypes from 'prop-types'
import MovieCard from '../components/movieList/MovieListCard'
import { WatchedGenresTimelineChart } from '../components/general/WatchedGenresTimelineChart'

function parseWatchedDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  const [year, month, day] = dateStr.split('-')
  const date = new Date(`${year}-${month}-${day}`)
  return date
}

export function WatchedMoviesScreen({
  movies,
  currentUsername,
  t,
  tGenre,
  onOpenDetail,
}) {
  // Filtrar películas vistas (que tienen myRating) y ordenar por fecha (más reciente primero)
  const watchedMovies = movies
    .filter(movie => movie.myRating)
    .sort((a, b) => {
      const dateA = parseWatchedDate(a.myWatchedOn)
      const dateB = parseWatchedDate(b.myWatchedOn)
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return dateB - dateA
    })

  // Estadísticas
  const stats = {
    total: watchedMovies.length,
    avgRating: watchedMovies.length > 0
      ? (watchedMovies.reduce((sum, m) => sum + Number(m.myRating || 0), 0) / watchedMovies.length).toFixed(2)
      : 0,
    byMonth: {},
  }

  for (const movie of watchedMovies) {
    const month = movie.myWatchedOn?.slice(0, 7)
    if (month) {
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1
    }
  }

  const mostActiveMonth = Object.entries(stats.byMonth).sort(([, a], [, b]) => b - a)[0]

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{t('watchedMoviesTitle')}</h2>
        <p className="muted">
          {t('watchedMoviesSubtitle', { count: watchedMovies.length })}
          {stats.total > 0 && ` • ${t('avgRatingLabel', 'Rating promedio')}: ${stats.avgRating}/5`}
          {mostActiveMonth && ` • ${t('mostActiveMonth', 'Más activo en')}: ${mostActiveMonth[0]}`}
        </p>
      </div>

      {watchedMovies.length > 0 && (
        <WatchedGenresTimelineChart watchedMovies={watchedMovies} t={t} tGenre={tGenre} />
      )}

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
            >
              <div>
                <p className="muted small">
                  {movie.myWatchedOn && t('watchedOn', 'Visto el')} {movie.myWatchedOn}
                  {movie.myRating && ` • ${t('detailRating')}: ${'★'.repeat(Math.floor(movie.myRating))}${Number(movie.myRating) % 1 >= 0.5 ? '½' : ''}`}
                </p>
              </div>
            </MovieCard>
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