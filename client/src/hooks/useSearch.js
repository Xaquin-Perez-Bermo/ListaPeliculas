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
  const [watchmodeLoading, setWatchmodeLoading] = useState(false)
  const [watchmodeError, setWatchmodeError] = useState('')
  const [isSearching, setIsSearching] = useState(false)

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

  const fetchWatchmodeData = useCallback(async (movie) => {
    setSelectedSearchMovie(movie)
    setWatchmodeData(null)
    setWatchmodeError('')
    setWatchmodeLoading(true)

    try {
      const data = await moviesAPI.getWatchmodeData(movie.title, movie.year)
      setWatchmodeData(data)
    } catch (error) {
      setWatchmodeError(error.message)
    } finally {
      setWatchmodeLoading(false)
    }
  }, [])

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
    watchmodeLoading,
    watchmodeError,
    fetchWatchmodeData,
    isSearching,
  }
}
