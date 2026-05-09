
const MovieList = ({ movies, handleFavouritesClick, favouriteComponent: FavouriteComponent }) => {
  return (
    <>
      {movies?.map((movie) => (
        <div key={movie.imdbID || movie.id} className="image-container">
          <img
            src={movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/200x300?text=No+Image'}
            alt={movie.Title || movie.title}
          />
          <div className="overlay" onClick={() => handleFavouritesClick(movie)}>
            <FavouriteComponent />
          </div>
          <div className="movie-card-text">
            <strong>{movie.Title || movie.title}</strong>
            <p>{movie.Year || movie.year || 'N/A'}</p>
          </div>
        </div>
      ))}
    </>
  )
}

export default MovieList
