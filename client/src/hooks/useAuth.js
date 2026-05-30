/**
 * useAuth Hook - Maneja la lógica de autenticación
 */

import { useEffect, useState } from 'react'
import { authAPI, setToken, getToken } from '../services/api'

function decodeUserFromToken(token) {
  if (!token) return null

  try {
    const parts = String(token).split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1]))
    if (payload?.username && payload?.id) {
      return { id: payload.id, username: payload.username }
    }
    return null
  } catch {
    return null
  }
}

export function useAuth() {
  const [authToken, setAuthToken] = useState(() => getToken() || '')
  const [user, setUser] = useState(() => decodeUserFromToken(getToken() || ''))
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
      setUser(data.user || null)
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

  useEffect(() => {
    if (!authToken) {
      setUser(null)
      return
    }

    setUser((prevUser) => prevUser || decodeUserFromToken(authToken))
  }, [authToken])

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

