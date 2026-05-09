/**
 * useSearch Hook - Maneja búsqueda externa e interna
 */

import { useState, useCallback, useEffect } from 'react'
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
    setSelectedSearchMovie(null)
    setWatchmodeData(null)
    setIsSearching(true)

    try {
      const data = await moviesAPI.discover(discoverQuery)
      setDiscoverResults(data)
    } catch (error) {
      setDiscoverError(error.message)
      setDiscoverResults([])
    } finally {
      setIsSearching(false)
    }
  }, [discoverQuery])

  useEffect(() => {
    if (!discoverResults.length) {
      return
    }

    discoverResults.forEach((movie) => {
      fetchWatchmodeDataForMovie(movie).catch(() => {})
    })
  }, [discoverResults, fetchWatchmodeDataForMovie])

  const fetchWatchmodeData = useCallback(async (movie) => {
    setSelectedSearchMovie(movie)
    setWatchmodeError('')
    setWatchmodeLoading(true)

    const key = movie.externalId || `${movie.title}-${movie.year}`
    const cached = watchmodeDataById[key]
    if (cached !== undefined) {
      setWatchmodeData(cached)
      setWatchmodeLoading(false)
      return
    }

    try {
      const data = await moviesAPI.getWatchmodeData(movie.title, movie.year)
      setWatchmodeDataById((prev) => ({
        ...prev,
        [key]: data,
      }))
      setWatchmodeData(data)
    } catch (error) {
      setWatchmodeError(error.message)
    } finally {
      setWatchmodeLoading(false)
    }
  }, [watchmodeDataById])

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
