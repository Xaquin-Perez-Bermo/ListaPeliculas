async function searchExternalMovies(query) {
  const cleanQuery = String(query || '').trim();

  if (!cleanQuery) {
    return [];
  }

  const apiKey = process.env.OMDB_API_KEY || '263d22d8';
  const response = await fetch(
    `https://www.omdbapi.com/?s=${encodeURIComponent(cleanQuery)}&type=movie&apikey=${encodeURIComponent(apiKey)}`
  );

  if (!response.ok) {
    throw new Error('No se pudo consultar la API de películas');
  }

  const data = await response.json();

  if (!Array.isArray(data.Search)) {
    return [];
  }

  return data.Search.map((item) => {
    const rawYear = Number.parseInt(String(item.Year || '').replaceAll(/\D/g, ''), 10);

    return {
      externalId: `omdb-${item.imdbID}`,
      title: item.Title || 'Sin título',
      year: Number.isNaN(rawYear) ? null : rawYear,
      genres: [],
      posterUrl: item.Poster && item.Poster !== 'N/A' ? item.Poster : null,
      overview: '',
      imdbId: item.imdbID || null,
    };
  });
}

module.exports = {
  searchExternalMovies,
};
