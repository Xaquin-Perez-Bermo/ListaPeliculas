/**
 * useAuth Hook - Maneja la lógica de autenticación
 */

import { useState } from 'react'
import { authAPI, setToken, getToken } from '../services/api'

export function useAuth() {
  const [authToken, setAuthToken] = useState(() => getToken() || '')
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setAuthError('')

    try {
      const endpoint = authMode === 'login' ? authAPI.login : authAPI.register
      const data = await endpoint(username, password)

      setAuthToken(data.token)
      setToken(data.token)
      setUsername('')
      setPassword('')
      setUser(null) // Will be loaded by useMovies on token change
    } catch (error) {
      setAuthError(error.message)
    }
  }

  const logout = () => {
    setAuthToken('')
    setToken('')
    setUser(null)
    setUsername('')
    setPassword('')
  }

  return {
    token: authToken,
    setAuthToken,
    user,
    setUser,
    authMode,
    setAuthMode,
    username,
    setUsername,
    password,
    setPassword,
    authError,
    setAuthError,
    handleAuthSubmit,
    logout,
    isAuthenticated: !!authToken,
  }
}

