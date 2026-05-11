/**
 * API Service - Centraliza todas las llamadas a la API
 */

let token = localStorage.getItem('token') || ''

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
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username, password) =>
    apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => apiCall('/api/auth/me'),
}

export const listsAPI = {
  create: (name) =>
    apiCall('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
}

// Movies endpoints
export const moviesAPI = {
  getAll: (status = 'all', genre = '') =>
    apiCall(`/api/movies?status=${status}&genre=${encodeURIComponent(genre)}`),

  getById: (id) => apiCall(`/api/movies/${id}`),

  create: (movie) =>
    apiCall('/api/movies', {
      method: 'POST',
      body: JSON.stringify(movie),
    }),

  remove: (id) =>
    apiCall(`/api/movies/${id}`, {
      method: 'DELETE',
    }),

  veto: (id) =>
    apiCall(`/api/movies/${id}/veto`, {
      method: 'POST',
    }),

  unveto: (id) =>
    apiCall(`/api/movies/${id}/veto`, {
      method: 'DELETE',
    }),

  getRandomPick: () => apiCall('/api/random-pick'),

  discover: (query) =>
    apiCall(`/api/discover?q=${encodeURIComponent(query)}`),

  getStreamingInfo: (title, year) => {
    const params = new URLSearchParams({ title })
    if (year) params.set('year', year)
    return apiCall(`/api/streaming-info?${params}`)
  },

  getRatings: (id) => apiCall(`/api/movies/${id}/ratings`),

  saveRating: (id, rating, watchedOn) =>
    apiCall(`/api/movies/${id}/rating`, {
      method: 'POST',
      body: JSON.stringify({ rating, watchedOn }),
    }),

  clearRating: (id) =>
    apiCall(`/api/movies/${id}/rating`, {
      method: 'DELETE',
    }),
  removeByExternal: (externalId) =>
    apiCall(`/api/movies/external/${encodeURIComponent(externalId)}`, {
      method: 'DELETE',
    }),
}

// Genre veto endpoints
export const genreVetoAPI = {
  getAll: () => apiCall('/api/veto-genres'),

  add: (genre) =>
    apiCall('/api/veto-genres', {
      method: 'POST',
      body: JSON.stringify({ genre }),
    }),

  remove: (genre) =>
    apiCall(`/api/veto-genres/${encodeURIComponent(genre)}`, {
      method: 'DELETE',
    }),
}

// Logs endpoints
export const logsAPI = {
  getAll: () => apiCall('/api/logs'),
}
