

/**
 * useLists Hook - carga listas desde la base de datos cuando hay sesión
 * y usa localStorage como caché/offline.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { loadLocalLists, saveLocalLists } from '../services/localStorage'
import { getToken, moviesAPI, listsAPI } from '../services/api'
import { mapMovieToLocal } from '../utils/movieUtils'

function findPreferredServerListByName(serverLists, listName) {
  const sameName = (serverLists || []).filter((list) => list.name === listName)
  if (!sameName.length) return null

  return (
    sameName.find((list) => list.isOwner) ||
    sameName.find((list) => list.isMember) ||
    sameName[0]
  )
}

export function useLists() {
  const [lists, setLists] = useState(() => loadLocalLists())
  const [serverLists, setServerLists] = useState([])
  const [publicLists, setPublicLists] = useState([])
  const [publicListQuery, setPublicListQuery] = useState('')
  const [listsLoading, setListsLoading] = useState(false)
  const refreshRequestRef = useRef(0)

  // persistir cache local
  useEffect(() => {
    saveLocalLists(lists)
  }, [lists])

  const refreshPublicLists = useCallback(async (queryOverride) => {
    const token = getToken()
    if (!token) return

    const query = typeof queryOverride === 'string' ? queryOverride : publicListQuery

    try {
      const result = await listsAPI.searchPublic(query)
      setPublicLists(Array.isArray(result) ? result : [])
    } catch {
      setPublicLists([])
    }
  }, [publicListQuery])

  const refreshFromServer = useCallback(async () => {
    const token = getToken()
    if (!token) return

    const requestId = refreshRequestRef.current + 1
    refreshRequestRef.current = requestId

    setListsLoading(true)
    try {
      const localCache = loadLocalLists()
      const fetchedServerLists = await listsAPI.getAll()
      const next = { ...localCache }

      const moviesPerList = await Promise.all(
        (fetchedServerLists || []).map(async (listItem) => {
          try {
            const movies = await listsAPI.getMovies(listItem.id)
            return {
              name: listItem.name,
              movies: Array.isArray(movies) ? movies.map(mapMovieToLocal) : [],
            }
          } catch {
            return {
              name: listItem.name,
              movies: next[listItem.name] || [],
            }
          }
        })
      )

      moviesPerList.forEach((entry) => {
        next[entry.name] = entry.movies
      })

      if (refreshRequestRef.current !== requestId) {
        return
      }

      setServerLists(Array.isArray(fetchedServerLists) ? fetchedServerLists : [])
      setLists(next)
    } catch {
      // fallback: keep local cache
    } finally {
      if (refreshRequestRef.current === requestId) {
        setListsLoading(false)
      }
    }
  }, [])

  // cargar desde servidor al montar si hay token (reemplaza/mergea listas conocidas)
  useEffect(() => {
    refreshFromServer()
  }, [refreshFromServer])

  useEffect(() => {
    let cancelled = false
    const token = getToken()
    if (!token) {
      return () => {
        cancelled = true
      }
    }

    const loadPublicLists = async () => {
      await refreshPublicLists(publicListQuery)
      if (cancelled) {
        return
      }
    }

    loadPublicLists()

    return () => {
      cancelled = true
    }
  }, [publicListQuery, refreshPublicLists])

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
        const persistMovieInServerList = async () => {
          try {
            const fetchedServerLists = await listsAPI.getAll()
            let serverList = findPreferredServerListByName(fetchedServerLists, listName)
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
        }

        persistMovieInServerList()
      }
    } catch {
      // ignore errors while syncing local update with server
    }
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
    } catch {
      // ignore errors while removing local movie from server
    }
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

  const createList = (listName, options = {}) => {
    if (!listName.trim() || listName === 'favoritas') return false
    try {
      const token = getToken()
      if (token) {
        listsAPI.create(listName, options).then(() => {
          refreshFromServer().catch(() => {})
        }).catch(() => {})
      }
    } catch {
      // ignore errors while creating list remotely
    }
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
        const deleteServerList = async () => {
          try {
            const serverList = await listsAPI.getListByName(listName).catch(() => null)
            if (serverList?.id) {
              await listsAPI.delete(serverList.id).catch(() => {})
            }
          } catch {
            // ignorar errores de red; la UI ya reflejó el borrado
          }
        }

        deleteServerList()
      }
    } catch {
      // ignore errors while deleting list remotely
    }

    return true
  }

  const subscribeToPublicList = async (listId) => {
    try {
      const token = getToken()
      if (!token) return false

      await listsAPI.subscribe(listId)
      await refreshFromServer()
      await refreshPublicLists()
      return true
    } catch {
      return false
    }
  }

  const subscribeToPrivateList = async (inviteCode) => {
    try {
      const token = getToken()
      if (!token) return false

      const cleanCode = String(inviteCode || '').trim()
      if (!cleanCode) return false

      await listsAPI.subscribeByInvite(cleanCode)
      await refreshFromServer()
      await refreshPublicLists()
      return true
    } catch {
      return false
    }
  }

  const updateListSettings = async (listId, payload) => {
    try {
      const token = getToken()
      if (!token) return false

      await listsAPI.updateSettings(listId, payload)
      await refreshFromServer()
      return true
    } catch {
      return false
    }
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
    serverLists,
    publicLists,
    publicListQuery,
    setPublicListQuery,
    listsLoading,
    refreshFromServer,
    subscribeToPublicList,
    subscribeToPrivateList,
    updateListSettings,
    // backward compatibility with previous API
    localLists: lists,
    addToLocalList: addToList,
    removeFromLocalList: removeFromList,
    toggleMovieInLocalList: toggleMovieInList,
  }
}

// backwards-compat alias for existing imports
export { useLists as useLocalLists }