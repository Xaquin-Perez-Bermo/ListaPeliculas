import MovieCard from "../general/MovieCard";

const SearchMovieCard = ({
    movie,
    t,
    tGenre,
    setLikeTargetMovie,
    fetchStreamingInfo,
    selectedSearchMovie,
    hasSavedAnywhere ,
    streamingInfoData,
    children,
    // Props opcionales con valores por defecto
    className = '',
}) => {
    const isSelected = selectedSearchMovie?.externalId === movie.externalId;
    const infoPlot = streamingInfoData?.plot_overview || streamingInfoData?.plot_overviews?.[0]?.body || '';
    const infoGenres = streamingInfoData?.genre_names || [];
    const moviePlot = movie.overview || infoPlot;
    const movieGenres = movie.genres?.length ? movie.genres : infoGenres;
    const hasStreamingInfo = Boolean(moviePlot || movieGenres.length);

    // Manejador para la card completa
    const handleCardClick = () => {
        fetchStreamingInfo(movie); // Si no se pasa prop, ejecutará () => {} sin romper nada
    };

    // Manejador para teclado (Accesibilidad)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
        }
    };

    return (

        <MovieCard
            key={movie.externalId || movie.id || movie.title}
            movie={movie}
            setLikeTargetMovie={setLikeTargetMovie}
            t={t}
            tGenre={tGenre}
            fetchStreamingInfo={fetchStreamingInfo}
            selectedSearchMovie={selectedSearchMovie}
            streamingInfoData={streamingInfoData}
            hasSavedAnywhere={hasSavedAnywhere}>
            <div className="search-card-footer">
                <button
                    className={`like-button ${hasSavedAnywhere ? '' : 'saved'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setLikeTargetMovie(movie); // Ejecutará () => {} si no hay prop
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    type="button"
                >
                    {hasSavedAnywhere ? t('savedButton') : t('likeButton')}
                </button>
            </div>
        </MovieCard>
    );
};

export default SearchMovieCard;