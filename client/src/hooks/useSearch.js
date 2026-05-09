/**
 * useSearch Hook - Maneja búsqueda externa e interna
 */

import { useState, useCallback } from 'react'
import { moviesAPI } from '../services/api'
import {
  filterMoviesByQuery,
  filterLogsByQuery,
} from '../utils/movieUtils'

export function useSearch(movies, logs) {
  const [searchMode, setSearchMode] = useState('externa')
  const [discoverQuery, setDiscoverQuery] = useState('')
  const [discoverResults, setDiscoverResults] = useState([])
  const [discoverError, setDiscoverError] = useState('')
  const [internalQuery, setInternalQuery] = useState('')
  const [selectedSearchMovie, setSelectedSearchMovie] = useState(null)
  const [watchmodeData, setWatchmodeData] = useState(null)
  const [watchmodeDataById, setWatchmodeDataById] = useState({})
  const [watchmodeLoading, setWatchmodeLoading] = useState(false)
  const [watchmodeLoadingById, setWatchmodeLoadingById] = useState({})
  const [watchmodeError, setWatchmodeError] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const fetchWatchmodeDataForMovie = useCallback(async (movie) => {
    const key = movie.externalId || `${movie.title}-${movie.year}`
    if (!key) {
      return null
    }

    if (watchmodeDataById[key] !== undefined || watchmodeLoadingById[key]) {
      return watchmodeDataById[key] || null
    }

    setWatchmodeLoadingById((prev) => ({
      ...prev,
      [key]: true,
    }))

    try {
      const data = await moviesAPI.getWatchmodeData(movie.title, movie.year)
      setWatchmodeDataById((prev) => ({
        ...prev,
        [key]: data,
      }))
      return data
    } catch {
      setWatchmodeDataById((prev) => ({
        ...prev,
        [key]: null,
      }))
      return null
    } finally {
      setWatchmodeLoadingById((prev) => ({
        ...prev,
        [key]: false,
      }))
    }
  }, [watchmodeDataById, watchmodeLoadingById])

  const handleDiscover = useCallback(async (event) => {
    event.preventDefault()
    setDiscoverError('')
    setDiscoverResults([])
    setSelectedSearchMovie(null)
    setWatchmodeData(null)
    setWatchmodeDataById({})
    setWatchmodeLoadingById({})
    setWatchmodeError('')
    setIsSearching(true)

    try {
      const data = await moviesAPI.discover(discoverQuery)
      const normalizedResults = Array.isArray(data) ? data : []

      // Precarga Watchmode al buscar para que el panel abra con datos listos.
      if (normalizedResults.length > 0) {
        await Promise.allSettled(
          normalizedResults.map((movie) => fetchWatchmodeDataForMovie(movie)),
        )
      }

      // Mostrar resultados solo cuando termina la precarga completa.
      setDiscoverResults(normalizedResults)
    } catch (error) {
      setDiscoverError(error.message)
      setDiscoverResults([])
    } finally {
      setIsSearching(false)
    }
  }, [discoverQuery, fetchWatchmodeDataForMovie])

  const fetchWatchmodeData = useCallback(async (movie) => {
    setSelectedSearchMovie(movie)
    setWatchmodeError('')

    try {
      setWatchmodeLoading(true)
      const data = await fetchWatchmodeDataForMovie(movie)
      setWatchmodeData(data)
    } catch (error) {
      setWatchmodeError(error.message)
    } finally {
      setWatchmodeLoading(false)
    }
  }, [fetchWatchmodeDataForMovie])

  const internalResults = {
    movies: filterMoviesByQuery(movies, internalQuery),
    logs: filterLogsByQuery(logs, internalQuery),
  }

  return {
    searchMode,
    setSearchMode,
    discoverQuery,
    setDiscoverQuery,
    discoverResults,
    discoverError,
    handleDiscover,
    internalQuery,
    setInternalQuery,
    internalResults,
    selectedSearchMovie,
    setSelectedSearchMovie,
    watchmodeData,
    setWatchmodeData,
    watchmodeDataById,
    watchmodeLoading,
    watchmodeLoadingById,
    watchmodeError,
    fetchWatchmodeData,
    fetchWatchmodeDataForMovie,
    isSearching,
  }
}
