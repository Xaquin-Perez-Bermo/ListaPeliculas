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
  const [streamingInfoData, setStreamingInfoData] = useState(null)
  const [streamingInfoDataById, setStreamingInfoDataById] = useState({})
  const [streamingInfoLoading, setStreamingInfoLoading] = useState(false)
  const [streamingInfoLoadingById, setStreamingInfoLoadingById] = useState({})
  const [streamingInfoError, setStreamingInfoError] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const fetchStreamingInfoForMovie = useCallback(async (movie) => {
    const key = movie.externalId || `${movie.title}-${movie.year}`
    if (!key) {
      return null
    }

    if (streamingInfoDataById[key] !== undefined || streamingInfoLoadingById[key]) {
      return streamingInfoDataById[key] || null
    }

    setStreamingInfoLoadingById((prev) => ({
      ...prev,
      [key]: true,
    }))

    try {
      const data = await moviesAPI.getStreamingInfo(movie.title, movie.year)
      setStreamingInfoDataById((prev) => ({
        ...prev,
        [key]: data,
      }))
      return data
    } catch {
      setStreamingInfoDataById((prev) => ({
        ...prev,
        [key]: null,
      }))
      return null
    } finally {
      setStreamingInfoLoadingById((prev) => ({
        ...prev,
        [key]: false,
      }))
    }
  }, [streamingInfoDataById, streamingInfoLoadingById])

  const handleDiscover = useCallback(async (event) => {
    event.preventDefault()
    setDiscoverError('')
    setDiscoverResults([])
    setSelectedSearchMovie(null)
    setStreamingInfoData(null)
    setStreamingInfoDataById({})
    setStreamingInfoLoadingById({})
    setStreamingInfoError('')
    setIsSearching(true)

    try {
      const data = await moviesAPI.discover(discoverQuery)
      const normalizedResults = Array.isArray(data) ? data : []
      setDiscoverResults(normalizedResults)
    } catch (error) {
      setDiscoverError(error.message)
      setDiscoverResults([])
    } finally {
      setIsSearching(false)
    }
  }, [discoverQuery])

  const fetchStreamingInfo = useCallback(async (movie) => {
    const key = movie.externalId || `${movie.title}-${movie.year}`
    const cachedData = key ? streamingInfoDataById[key] : null

    setSelectedSearchMovie(movie)
    setStreamingInfoError('')
    setStreamingInfoData(cachedData || null)

    if (cachedData) {
      setStreamingInfoLoading(false)
      return
    }

    try {
      setStreamingInfoLoading(true)
      const data = await fetchStreamingInfoForMovie(movie)
      setStreamingInfoData(data)
    } catch (error) {
      setStreamingInfoError(error.message)
    } finally {
      setStreamingInfoLoading(false)
    }
  }, [fetchStreamingInfoForMovie, streamingInfoDataById])

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
    streamingInfoData,
    setStreamingInfoData,
    streamingInfoDataById,
    streamingInfoLoading,
    streamingInfoLoadingById,
    streamingInfoError,
    fetchStreamingInfo,
    fetchStreamingInfoForMovie,
    isSearching,
  }
}
