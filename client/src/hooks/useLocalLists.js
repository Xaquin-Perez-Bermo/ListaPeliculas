/**
 * useLocalLists Hook - Maneja listas locales en localStorage
 */

import { useState, useEffect } from 'react'
import { loadLocalLists, saveLocalLists } from '../services/localStorage'
import { getToken, moviesAPI, listsAPI } from '../services/api'
import { mapMovieToLocal } from '../utils/movieUtils'

export function useLocalLists() {
  const [localLists, setLocalLists] = useState(() => loadLocalLists())

  // Sync with localStorage whenever lists change
  useEffect(() => {
    saveLocalLists(localLists)
  }, [localLists])

  const addToLocalList = (listName, movie) => {
    const mappedMovie = mapMovieToLocal(movie)

    setLocalLists((prev) => {
      // Create list if it doesn't exist
      if (!prev[listName]) {
        return {
          ...prev,
          [listName]: [mappedMovie],
        }
      }

      const exists = prev[listName].some((item) => item.externalId === mappedMovie.externalId)
      if (exists) return prev

      return {
        ...prev,
        [listName]: [mappedMovie, ...prev[listName]],
      }
    })
    // Persist to server if authenticated (background). Enrich with streamingInfo when missing.
    try {
      const token = getToken()
      if (token) {
        (async () => {
          const payload = {
            title: movie.title,
            externalId: movie.externalId,
            year: movie.year,
            posterUrl: movie.posterUrl,
            genres: movie.genres,
            overview: movie.overview,
          }

          const needsGenres = !payload.genres || (Array.isArray(payload.genres) && payload.genres.length === 0) || String(payload.genres || '').trim() === ''
          const needsOverview = !payload.overview || String(payload.overview || '').trim() === ''

          if ((needsGenres || needsOverview) && movie.title) {
            try {
              const info = await moviesAPI.getStreamingInfo(movie.title, movie.year)
              if (info) {
                if (needsGenres && Array.isArray(info.genre_names) && info.genre_names.length) {
                  payload.genres = info.genre_names
                }
                if (needsOverview && info.plot_overview) {
                  payload.overview = info.plot_overview
                }
                if (!payload.posterUrl && info.poster) {
                  payload.posterUrl = info.poster
                }
              }
            } catch (_) {
              // ignore provider errors
            }
          }

          try {
            await moviesAPI.create(payload)
          } catch (_) {
            // ignore network errors
          }
        })()
      }
    } catch {}
  }

  const removeFromLocalList = (listName, externalId) => {
    setLocalLists((prev) => ({
      ...prev,
      [listName]: (prev[listName] || []).filter((m) => m.externalId !== externalId),
    }))
    // Persist removal to server if authenticated (background)
    try {
      const token = getToken()
      if (token) {
        moviesAPI.removeByExternal(externalId).catch(() => {})
      }
    } catch {}
  }

  const getListsForMovie = (externalId) => {
    if (!externalId) return []

    return Object.entries(localLists)
      .filter(([, items]) => Array.isArray(items) && items.some((m) => m.externalId === externalId))
      .map(([listName]) => listName)
  }

  const isMovieSaved = (externalId) => getListsForMovie(externalId).length > 0

  const toggleMovieInLocalList = (listName, movie) => {
    const mappedMovie = mapMovieToLocal(movie)

    setLocalLists((prev) => {
      const currentList = prev[listName] || []
      const exists = currentList.some((item) => item.externalId === mappedMovie.externalId)

      if (exists) {
        return {
          ...prev,
          [listName]: currentList.filter((item) => item.externalId !== mappedMovie.externalId),
        }
      }

      return {
        ...prev,
        [listName]: [mappedMovie, ...currentList],
      }
    })
    // If we just added the movie (not removed), persist similarly to addToLocalList
    try {
      const token = getToken()
      if (token) {
        (async () => {
          const payload = {
            title: movie.title,
            externalId: movie.externalId,
            year: movie.year,
            posterUrl: movie.posterUrl,
            genres: movie.genres,
            overview: movie.overview,
          }

          const needsGenres = !payload.genres || (Array.isArray(payload.genres) && payload.genres.length === 0) || String(payload.genres || '').trim() === ''
          const needsOverview = !payload.overview || String(payload.overview || '').trim() === ''

          if ((needsGenres || needsOverview) && movie.title) {
            try {
              const info = await moviesAPI.getStreamingInfo(movie.title, movie.year)
              if (info) {
                if (needsGenres && Array.isArray(info.genre_names) && info.genre_names.length) {
                  payload.genres = info.genre_names
                }
                if (needsOverview && info.plot_overview) {
                  payload.overview = info.plot_overview
                }
                if (!payload.posterUrl && info.poster) {
                  payload.posterUrl = info.poster
                }
              }
            } catch (_) {
              // ignore provider errors
            }
          }

          try {
            await moviesAPI.create(payload)
          } catch (_) {
            // ignore network errors
          }
        })()
      }
    } catch {}
  }

  const createList = (listName) => {
    if (!listName.trim() || listName === 'favoritas') return false
    // Try to create server-side list when authenticated (fire-and-forget)
    try {
      const token = getToken()
      if (token) {
        listsAPI.create(listName).catch(() => {})
      }
    } catch {}
    setLocalLists((prev) => {
      if (prev[listName]) return prev
      return {
        ...prev,
        [listName]: [],
      }
    })
    return true
  }

  const deleteList = (listName) => {
    // Never allow deleting 'favoritas'
    if (listName === 'favoritas') return false
    
    setLocalLists((prev) => {
      const next = { ...prev }
      delete next[listName]
      return next
    })
    return true
  }

  return {
    localLists,
    addToLocalList,
    removeFromLocalList,
    toggleMovieInLocalList,
    getListsForMovie,
    isMovieSaved,
    createList,
    deleteList,
  }
}
