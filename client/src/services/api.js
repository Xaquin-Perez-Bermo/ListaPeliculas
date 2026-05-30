/**
 * API Service - Centraliza todas las llamadas a la API
 */

let token = localStorage.getItem('token') || ''
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function withBase(path) {
  return `${API_BASE_URL}${path}`
}

function withOptionalListId(path, listId) {
  if (!listId) return path
  const query = new URLSearchParams({ listId: String(listId) })
  return `${path}?${query.toString()}`
}

export function setToken(newToken) {
  token = newToken
  if (newToken) {
    localStorage.setItem('token', newToken)
  } else {
    localStorage.removeItem('token')
  }
}

export function getToken() {
  return token
}

export async function apiCall(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  let body
  try {
    body = await response.json()
  } catch {
    body = {}
  }

  if (!response.ok) {
    throw new Error(body.error || 'Error inesperado en la API')
  }

  return body
}

// Auth endpoints
export const authAPI = {
  login: (username, password) =>
    apiCall(withBase('/api/auth/login'), {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username, password) =>
    apiCall(withBase('/api/auth/register'), {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => apiCall(withBase('/api/auth/me')),
}

export const listsAPI = {
  create: (name, options = {}) =>
    apiCall(withBase('/api/lists'), {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: options.description || '',
        coverUrl: options.coverUrl || null,
        visibility: options.visibility || (options.isPublic ? 'public' : 'personal'),
        allowVeto: options.allowVeto === undefined ? true : Boolean(options.allowVeto),
        allowMemberAdd: options.allowMemberAdd === undefined ? true : Boolean(options.allowMemberAdd),
        allowMemberVeto: options.allowMemberVeto === undefined ? true : Boolean(options.allowMemberVeto),
      }),
    }),
  delete: (listId) =>
    apiCall(withBase(`/api/lists/${listId}`), {
      method: 'DELETE',
    }),
  getAll: () => apiCall(withBase('/api/lists')),
  getListById: (listId) => apiCall(withBase(`/api/lists/id/${listId}`)),
  getListByName: (listName) => apiCall(withBase(`/api/lists/name/${listName}`)),
  getMovies: (listId) => apiCall(withBase(`/api/lists/${listId}/movies`)),
  searchPublic: (query = '') =>
    apiCall(withBase(`/api/lists/public?q=${encodeURIComponent(query)}`)),
  subscribe: (listId) =>
    apiCall(withBase(`/api/lists/${listId}/subscribe`), {
      method: 'POST',
    }),
  subscribeByInvite: (inviteCode) =>
    apiCall(withBase(`/api/lists/subscribe/${encodeURIComponent(inviteCode)}`), {
      method: 'POST',
    }),
  updateSettings: (listId, payload) =>
    apiCall(withBase(`/api/lists/${listId}/settings`), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  addMovieToList: (listId, movieId) =>
    apiCall(withBase(`/api/lists/${listId}/add-movie`), {
      method: 'POST',
      body: JSON.stringify({ id: movieId }),
    }),
  removeMovieFromList: (listId, movieId) =>
    apiCall(withBase(`/api/lists/${listId}/remove-movie`), {
      method: 'POST',
      body: JSON.stringify({ id: movieId }),
    }),
}

// Movies endpoints
export const moviesAPI = {
  getAll: (status = 'all', genre = '') =>
    apiCall(withBase(`/api/movies?status=${status}&genre=${encodeURIComponent(genre)}`)),

  getById: (id) => apiCall(withBase(`/api/movies/${id}`)),

  getByExternalId: (externalId) => apiCall(withBase(`/api/movies/external/${encodeURIComponent(externalId)}`)),

  create: (movie) =>
    apiCall(withBase('/api/movies'), {
      method: 'POST',
      body: JSON.stringify(movie),
    }),

  remove: (id) =>
    apiCall(withBase(`/api/movies/${id}`), {
      method: 'DELETE',
    }),

  veto: (id, listId) =>
    apiCall(withBase(withOptionalListId(`/api/movies/${id}/veto`, listId)), {
      method: 'POST',
    }),

  unveto: (id, listId) =>
    apiCall(withBase(withOptionalListId(`/api/movies/${id}/veto`, listId)), {
      method: 'DELETE',
    }),

  getRandomPick: () => apiCall(withBase('/api/random-pick')),

  discover: (query) =>
    apiCall(withBase(`/api/discover?q=${encodeURIComponent(query)}`)),

  getStreamingInfo: (title, year) => {
    const params = new URLSearchParams({ title })
    if (year) params.set('year', year)
    return apiCall(withBase(`/api/streaming-info?${params}`))
  },

  getRatings: (id) => apiCall(withBase(`/api/movies/${id}/ratings`)),

  saveRating: (id, rating, watchedOn) =>
    apiCall(withBase(`/api/movies/${id}/rating`), {
      method: 'POST',
      body: JSON.stringify({ rating, watchedOn }),
    }),

  clearRating: (id) =>
    apiCall(withBase(`/api/movies/${id}/rating`), {
      method: 'DELETE',
    }),
  removeByExternal: (externalId) =>
    apiCall(withBase(`/api/movies/external/${encodeURIComponent(externalId)}`), {
      method: 'DELETE',
    }),
}


// Genre veto endpoints
export const genreVetoAPI = {
  getAll: (listId) =>
    apiCall(withBase(withOptionalListId('/api/veto-genres', listId))),

  add: (genre, listId) =>
    apiCall(withBase('/api/veto-genres'), {
      method: 'POST',
      body: JSON.stringify({ genre, listId }),
    }),

  remove: (genre, listId) =>
    apiCall(withBase(withOptionalListId(`/api/veto-genres/${encodeURIComponent(genre)}`, listId)), {
      method: 'DELETE',
    }),
}

// Logs endpoints
export const logsAPI = {
  getAll: () => apiCall(withBase('/api/logs')),
}
