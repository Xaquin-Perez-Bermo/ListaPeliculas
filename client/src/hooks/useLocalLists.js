/**
 * useLocalLists Hook - Maneja listas locales en localStorage
 */

import { useState, useEffect } from 'react'
import { loadLocalLists, saveLocalLists } from '../services/localStorage'
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
  }

  const removeFromLocalList = (listName, externalId) => {
    setLocalLists((prev) => ({
      ...prev,
      [listName]: (prev[listName] || []).filter((m) => m.externalId !== externalId),
    }))
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
  }

  const createList = (listName) => {
    if (!listName.trim() || listName === 'favoritas') return false
    
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
