const SearchMovieCard = ({
  movie,
  setLikeTargetMovie,
  t,
  tGenre,
  fetchStreamingInfo,
  selectedSearchMovie,
  hasSavedAnywhere,
  streamingInfoData,
}) => {
  const isSelected = selectedSearchMovie?.externalId === movie.externalId;
  const infoPlot = streamingInfoData?.plot_overview || streamingInfoData?.plot_overviews?.[0]?.body || '';
  const infoGenres = streamingInfoData?.genre_names || [];
  const moviePlot = movie.overview || infoPlot;
  const movieGenres = movie.genres?.length ? movie.genres : infoGenres;
  const hasStreamingInfo = Boolean(moviePlot || movieGenres.length);

  // Manejador para la card completa
  const handleCardClick = () => {
    fetchStreamingInfo(movie);
  };

  // Manejador para teclado (Accesibilidad)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <li className={`movie-card${isSelected ? ' card-selected' : ''}`}>
      <article
        className="search-card search-card-hitbox"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={t('openMovieInfoAria', { title: movie.title })}
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

            {hasStreamingInfo && (
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