import React from 'react'

const SearchMovieCard = ({
  movie,
  setLikeTargetMovie,
  t,
  fetchWatchmodeData,
  selectedSearchMovie,
  hasSavedAnywhere,
  watchmodeData,
}) => {
  const isSelected = selectedSearchMovie?.externalId === movie.externalId
  const watchmodePlot =
    watchmodeData?.plot_overview ||
    (watchmodeData?.plot_overviews?.[0] && watchmodeData.plot_overviews[0].body) ||
    ''
  const watchmodeGenres = watchmodeData?.genre_names || []
  const moviePlot = movie.overview || watchmodePlot
  const movieGenres = movie.genres?.length ? movie.genres : watchmodeGenres
  const hasWatchmodeInfo = Boolean(moviePlot || movieGenres.length)

  return (
    <li
      className={`movie-card search-card${isSelected ? ' card-selected' : ''}`}
      onClick={() => fetchWatchmodeData(movie)}
      style={{ cursor: 'pointer' }}
    >
      {movie.posterUrl ? (
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="search-poster"
        />
      ) : null}

      <div className="search-card-body">
        <div className="movie-main">
          <div>
            <strong>{movie.title}</strong>
            <p className="muted">{movie.year || t('naLabel')}</p>
          </div>

          {hasWatchmodeInfo ? (
            <div className="search-card-info">
              {movieGenres.length ? (
                <div className="chip-row search-genre-row">
                  {movieGenres.map((genre) => (
                    <span key={genre} className="chip">
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}
              {moviePlot ? (
                <p className="muted small search-plot">{moviePlot}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="search-card-footer">
          <button
            className={`like-button ${hasSavedAnywhere ? 'saved' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setLikeTargetMovie(movie)
            }}
            type="button"
          >
            {hasSavedAnywhere ? t('savedButton') : t('likeButton')}
          </button>
        </div>
      </div>
    </li>
  )
}

export default SearchMovieCard
