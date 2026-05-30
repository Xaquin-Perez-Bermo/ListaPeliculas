/**
 * useMovies Hook - Maneja películas, datos de ratings, y lógica de veto
 */

import { useState, useEffect, useCallback } from 'react'
import { moviesAPI, genreVetoAPI, logsAPI, authAPI } from '../services/api'

export function useMovies(token) {
  const [user, setUser] = useState(null)
  const [movies, setMovies] = useState([])
  const [genreVetoes, setGenreVetoes] = useState([])
  const [logs, setLogs] = useState([])
  const [statusFilter, setStatusFilter] = useState(() => {
    // Cargar filtro de estado desde localStorage
    return localStorage.getItem('statusFilter') || 'all'
  })
  const [genreFilter, setGenreFilter] = useState('')
  const [selectedMovieId, setSelectedMovieId] = useState(null)
  const [detailRatings, setDetailRatings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!token) return

    setLoading(true)
    try {
      const [me, moviesData, genreData, logsData] = await Promise.all([
        authAPI.me(),
        moviesAPI.getAll(statusFilter, genreFilter),
        genreVetoAPI.getAll(),
        logsAPI.getAll(),
      ])

      setUser(me)
      setMovies(moviesData)
      setGenreVetoes(genreData)
      setLogs(logsData)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter, genreFilter])

  // Load data when token or filters change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Guardar statusFilter en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('statusFilter', statusFilter)
  }, [statusFilter])

  // Load ratings when selected movie changes
  useEffect(() => {
    if (!selectedMovieId || !token) {
      setDetailRatings([])
      return
    }

    moviesAPI
      .getRatings(selectedMovieId)
      .then(setDetailRatings)
      .catch(() => setDetailRatings([]))
  }, [selectedMovieId, token])

  const vetoMovie = async (movieId, listId) => {
    try {
      await moviesAPI.veto(movieId, listId)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const unvetoMovie = async (movieId, listId) => {
    try {
      await moviesAPI.unveto(movieId, listId)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const saveRating = async (movieId, rating, watchedOn) => {
    try {
      await moviesAPI.saveRating(movieId, rating, watchedOn)
      await loadData()
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const clearRating = async (movieId) => {
    try {
      await moviesAPI.clearRating(movieId)
      await loadData()
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const pickRandomMovie = async () => {
    try {
      const data = await moviesAPI.getRandomPick()
      setSelectedMovieId(data.id)
      return data
    } catch (err) {
      setError(err.message)
      return null
    }
  }

  const addMovie = async (movie) => {
    try {
      await moviesAPI.create(movie)
      await loadData()
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const addGenreVeto = async (genre, listId) => {
    try {
      await genreVetoAPI.add(genre, listId)
      await loadData()
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const removeGenreVeto = async (genre, listId) => {
    try {
      await genreVetoAPI.remove(genre, listId)
      await loadData()
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const selectedMovie = movies.find((m) => m.id === selectedMovieId) || null

  return {
    user,
    setUser,
    movies,
    genreVetoes,
    logs,
    statusFilter,
    setStatusFilter,
    genreFilter,
    setGenreFilter,
    selectedMovieId,
    setSelectedMovieId,
    selectedMovie,
    detailRatings,
    loading,
    error,
    setError,
    vetoMovie,
    unvetoMovie,
    saveRating,
    clearRating,
    pickRandomMovie,
    addMovie,
    addGenreVeto,
    removeGenreVeto,
  }
}
