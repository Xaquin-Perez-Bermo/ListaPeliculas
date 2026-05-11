/**
 * Utility functions
 */

export function mapMovieToLocal(movie) {
  return {
    id: movie.id,
    externalId: movie.externalId,
    title: movie.title,
    year: movie.year,
    genres: movie.genres || [],
    posterUrl: movie.posterUrl || null,
    overview: movie.overview || '',
  }
}

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function formatStreamingSource(source) {
  let suffix = ''
  if (source.type === 'rent') suffix = ' (alquiler)'
  else if (source.type === 'buy') suffix = ' (compra)'
  return source.name + suffix
}

export function deduplicateStreamingSources(sources) {
  return [...new Map(sources.map((s) => [s.name, s])).values()]
}

export function filterMoviesByQuery(movies, query) {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return movies.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.genres.some((g) => g.toLowerCase().includes(q)) ||
      (m.createdBy || '').toLowerCase().includes(q),
  )
}

export function filterLogsByQuery(logs, query) {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return logs.filter(
    (l) =>
      l.action.toLowerCase().includes(q) ||
      (l.username || '').toLowerCase().includes(q),
  )
}

export function groupGenreVetoesByGenre(vetoes) {
  return vetoes.reduce((acc, item) => {
    if (!acc[item.genre]) acc[item.genre] = []
    acc[item.genre].push(item.username)
    return acc
  }, {})
}
