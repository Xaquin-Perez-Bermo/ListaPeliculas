import MovieCard from "../general/MovieCard";
import PropTypes from 'prop-types';
import { useSearchScreenContext } from "../../screens/searchScreen/SearchScreenContext";

const SearchMovieCard = ({
    movie,
    setLikeTargetMovie,
    onSelectMovie,
    streamingInfoData,
}) => {
    const {
        t,
        tGenre,
        selectedSearchMovie,
        isInSharedList,
        getListsForMovie,
    } = useSearchScreenContext();

    const savedInLists = getListsForMovie(movie.externalId);
    const hasSavedLocal = savedInLists.length > 0;
    const hasSavedAnywhere = hasSavedLocal || isInSharedList(movie.externalId);

    return (

        <MovieCard
            key={movie.externalId || movie.id || movie.title}
            movie={movie}
            setLikeTargetMovie={setLikeTargetMovie}
            t={t}
            tGenre={tGenre}
            fetchStreamingInfo={onSelectMovie}
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

SearchMovieCard.propTypes = {
    movie: PropTypes.shape({
        externalId: PropTypes.string,
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        title: PropTypes.string,
    }).isRequired,
    setLikeTargetMovie: PropTypes.func.isRequired,
    onSelectMovie: PropTypes.func.isRequired,
    streamingInfoData: PropTypes.object,
};

export default SearchMovieCard;