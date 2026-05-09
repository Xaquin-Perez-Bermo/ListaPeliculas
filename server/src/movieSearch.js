async function searchExternalMovies(query) {
  const cleanQuery = String(query || '').trim();

  if (!cleanQuery) {
    return [];
  }

  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=movie&limit=25`
  );

  if (!response.ok) {
    throw new Error('No se pudo consultar la API externa de peliculas');
  }

  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((item) => {
    const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
    const genre = item.primaryGenreName || 'Sin genero';

    return {
      externalId: `itunes-${item.trackId}`,
      title: item.trackName || 'Sin titulo',
      year,
      genres: [genre],
      posterUrl: item.artworkUrl100 || null,
      overview: item.longDescription || item.shortDescription || '',
    };
  });
}

module.exports = {
  searchExternalMovies,
};
