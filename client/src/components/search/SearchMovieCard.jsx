const SearchMovieCard = ({
  movie,
  setLikeTargetMovie,
  t,
  tGenre,
  fetchWatchmodeData,
  selectedSearchMovie,
  hasSavedAnywhere,
  watchmodeData,
}) => {
  const isSelected = selectedSearchMovie?.externalId === movie.externalId;
  const watchmodePlot = watchmodeData?.plot_overview || watchmodeData?.plot_overviews?.[0]?.body || '';
  const watchmodeGenres = watchmodeData?.genre_names || [];
  const moviePlot = movie.overview || watchmodePlot;
  const movieGenres = movie.genres?.length ? movie.genres : watchmodeGenres;
  const hasWatchmodeInfo = Boolean(moviePlot || movieGenres.length);

  // Manejador para la card completa
  const handleCardClick = () => {
    fetchWatchmodeData(movie);
  };

  // Manejador para teclado (Accesibilidad)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <li className={`movie-card search-card${isSelected ? ' card-selected' : ''}`}>
      <article
        className="search-card-hitbox"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        role="button"
        aria-label={t('openMovieInfoAria', { title: movie.title })}
        style={{ cursor: 'pointer' }} 
      >
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} className="search-poster" />
        ) : null}

        <div className="search-card-body">
          <div className="movie-main">
            <div>
              <strong>{movie.title}</strong>
              <p className="muted">{movie.year || t('naLabel')}</p>
            </div>

            {hasWatchmodeInfo && (
              <div className="search-card-info">
                {movieGenres.length > 0 && (
                  <div className="chip-row search-genre-row">
                    {movieGenres.map((genre) => (
                      <span key={genre} className="chip">{tGenre(genre)}</span>
                    ))}
                  </div>
                )}
                {moviePlot && <p className="muted small search-plot">{moviePlot}</p>}
              </div>
            )}
          </div>

          <div className="search-card-footer">
            <button
              className={`like-button ${hasSavedAnywhere ? '' : 'saved'}`}
              onClick={(e) => {
                e.stopPropagation(); // Evita que se abra el modal al dar Like
                setLikeTargetMovie(movie);
              }}
              onKeyDown={(e) => e.stopPropagation()} // Evita que Enter en el like active la card
              type="button"
            >
              {hasSavedAnywhere ? t('savedButton') : t('likeButton')}
            </button>
          </div>
        </div>
      </article>
    </li>
  );
};
export default SearchMovieCard;