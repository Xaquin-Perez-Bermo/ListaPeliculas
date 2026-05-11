

/**
 * useLists Hook - carga listas desde la base de datos cuando hay sesión
 * y usa localStorage como caché/offline.
 */

import { useState, useEffect } from 'react'
import { loadLocalLists, saveLocalLists } from '../services/localStorage'
import { getToken, moviesAPI, listsAPI } from '../services/api'
import { mapMovieToLocal } from '../utils/movieUtils'

export function useLists() {
  const [lists, setLists] = useState(() => loadLocalLists())

  // persistir cache local
  useEffect(() => {
    saveLocalLists(lists)
  }, [lists])

  // cargar desde servidor al montar si hay token (reemplaza/mergea listas conocidas)
  useEffect(() => {
    let cancelled = false
    const token = getToken()
    if (!token) return

    async function fetchServerLists() {
      try {
        const localCache = loadLocalLists()
        const serverLists = await listsAPI.getAll()
        const next = { ...localCache }
        for (const l of serverLists) {
          try {
            const movies = await listsAPI.getMovies(l.id)
            next[l.name] = Array.isArray(movies) ? movies.map(mapMovieToLocal) : []
          } catch {
            next[l.name] = next[l.name] || []
          }
        }
        if (!cancelled) setLists(next)
      } catch {
        // fallback: keep local cache
      }
    }

    fetchServerLists()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addToList = (listName, movie) => {
    const mapped = mapMovieToLocal(movie)

    setLists((prev) => {
      if (!prev[listName]) return { ...prev, [listName]: [mapped] }
      if (prev[listName].some((m) => m.externalId === mapped.externalId)) return prev
      return { ...prev, [listName]: [mapped, ...prev[listName]] }
    })

    // persistir en servidor si hay sesión
    try {
      const token = getToken()
      if (token) {
        ;(async () => {
          try {
            let serverLists = await listsAPI.getAll()
            let serverList = serverLists.find((s) => s.name === listName)
            if (!serverList) {
              serverList = await listsAPI.create(listName)
            }

            await moviesAPI.create({
              title: movie.title,
              externalId: movie.externalId,
              year: movie.year,
              posterUrl: movie.posterUrl,
              genres: movie.genres,
              overview: movie.overview,
              listId: serverList.id,
            })
          } catch {
            // ignore network errors
          }
        })()
      }
    } catch {}
  }

  const removeFromList = (listName, externalId) => {
    setLists((prev) => ({
      ...prev,
      [listName]: (prev[listName] || []).filter((m) => m.externalId !== externalId),
    }))

    try {
      const token = getToken()
      if (token) {
        // convenience endpoint: DELETE /api/movies/external/:externalId removes user's entry
        moviesAPI.removeByExternal(externalId).catch(() => {})
      }
    } catch {}
  }

  const getListsForMovie = (externalId) => {
    if (!externalId) return []

    return Object.entries(lists)
      .filter(([, items]) => Array.isArray(items) && items.some((m) => m.externalId === externalId))
      .map(([listName]) => listName)
  }

  const isMovieSaved = (externalId) => getListsForMovie(externalId).length > 0

  const toggleMovieInList = (listName, movie) => {
    const mapped = mapMovieToLocal(movie)
    const currentlyIn = (lists[listName] || []).some((m) => m.externalId === mapped.externalId)
    if (currentlyIn) {
      removeFromList(listName, mapped.externalId)
    } else {
      addToList(listName, movie)
    }
  }

  const createList = (listName) => {
    if (!listName.trim() || listName === 'favoritas') return false
    try {
      const token = getToken()
      if (token) {
        listsAPI.create(listName).catch(() => {})
      }
    } catch {}
    setLists((prev) => (prev[listName] ? prev : { ...prev, [listName]: [] }))
    return true
  }

  const deleteList = (listName) => {
    if (listName === 'favoritas') return false

    // Optimista: actualizamos UI primero
    setLists((prev) => {
      const next = { ...prev }
      delete next[listName]
      return next
    })

    // Borrar en servidor si hay sesión: resolvemos el id por nombre y hacemos DELETE
    try {
      const token = getToken()
      if (token) {
        ;(async () => {
          try {
            const serverList = await listsAPI.getListByName(listName).catch(() => null)
            if (serverList?.id) {
              await listsAPI.delete(serverList.id).catch(() => {})
            }
          } catch {
            // ignorar errores de red; la UI ya reflejó el borrado
          }
        })()
      }
    } catch {}

    return true
  }

  return {
    // new API
    lists,
    addToList,
    removeFromList,
    toggleMovieInList,
    getListsForMovie,
    isMovieSaved,
    createList,
    deleteList,
    // backward compatibility with previous API
    localLists: lists,
    addToLocalList: addToList,
    removeFromLocalList: removeFromList,
    toggleMovieInLocalList: toggleMovieInList,
  }
}

// backwards-compat alias for existing imports
export { useLists as useLocalLists }