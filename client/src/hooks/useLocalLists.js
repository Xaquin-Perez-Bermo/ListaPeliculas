/**
 * useLocalLists Hook - Maneja listas locales
 */

import { useState, useEffect } from 'react'
import { loadLocalLists, saveLocalLists } from '../services/localStorage'
import { getToken, moviesAPI, listsAPI } from '../services/api'
import { mapMovieToLocal } from '../utils/movieUtils'

export function useLocalLists() {
  const [localLists, setSelectedLists] = useState(() => loadLocalLists())

  // Sync with localStorage whenever lists change
  useEffect(() => {
    saveLocalLists(localLists)
  }, [localLists])

  const addToSelectedList = (listName, movie) => {
    const token = getToken()

    if (token) {
      (async () => {
        try {
          let lists = await listsAPI.getAll();
          let selectedList = lists.find(l => l.name === listName);
          if (!selectedList) {
            // Create the list if it doesn't exist
            try {
              const newList = await listsAPI.create({ name: listName });
              selectedList = newList;
            } catch (error) {
              console.error('Error creating list:', error);
            }
            try {
              const movie = await moviesAPI.getByExternalId(movie.externalId)
              if (!movie) {

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
                const movie = await moviesAPI.create(payload);

              }
            }
            catch (error) {
              console.error('Error al obtener la película:', error);
            }
            await listsAPI.addMovieToList(selectedList.id, movie.id);
          }
        } catch (error) {
          console.error('Error fetching lists:', error);
        }
      })()
    }

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
  }


  const removeFromSelectedList = (listName, movieId) => {
    setSelectedLists((prev) => ({
      ...prev,
      [listName]: (prev[listName] || []).filter((m) => m.movieId !== movieId),
    }))
    // Persist removal to server if authenticated (background)
    try {
      const token = getToken()
      if (token) {
        listsAPI.removeMovieFromList(listName, movieId).catch(() => { })
      }
    } catch { }
  }

  const getListsForMovie = (externalId) => {
    if (!externalId) return []

    return Object.entries(localLists)
      .filter(([, items]) => Array.isArray(items) && items.some((m) => m.externalId === externalId))
      .map(([listName]) => listName)
  }

  const isMovieSaved = (externalId) => getListsForMovie(externalId).length > 0


  // Si ya está en la lista, lo quita; si no, lo añade
  const toggleMovieInLocalList = (listName, movie) => {
    const mappedMovie = mapMovieToLocal(movie)

    setSelectedLists((prev) => {
      const currentList = prev[listName] || []
      const exists = currentList.some((item) => item.externalId === mappedMovie.id)

      if (exists) {
        removeFromSelectedList(listName, mappedMovie.id)
        return {
          ...prev,
          [listName]: currentList.filter((item) => item.externalId !== mappedMovie.id),
        }
      } else {
        addToSelectedList(listName, movie)
      }

      return {
        ...prev,
        [listName]: [mappedMovie, ...currentList],
      }
    })
  }

  const createList = (listName) => {
    if (!listName.trim() || listName === 'favoritas') return false
    const token = getToken()
    if (token) {
      (async () => {
        try {
          await listsAPI.create(listName.trim())
        } catch (error) {
          console.error('Error creating list:', error);
        }
      })()
    }
    setSelectedLists((prev) => {
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

    const token = getToken();
    if (token) {
      (async () => {
        try {
          const list = awaitlistsAPI.getListByName(listName).catch(() => null)
          if (list) {
            listsAPI.delete(list.id).catch(() => { })
          }
        } catch (error) {
          console.error('Error creating list:', error);
        }
      })()
    }

    setSelectedLists((prev) => {
      const next = { ...prev }
      delete next[listName]
      return next
    })

    return true
  }

  return {
    localLists,
    addToLocalList: addToSelectedList,
    removeFromLocalList: removeFromSelectedList,
    toggleMovieInLocalList,
    getListsForMovie,
    isMovieSaved,
    createList,
    deleteList,
  }

}