/**
 * useNavigation Hook - Maneja la navegación entre pantallas
 */

import { useState, useEffect } from 'react'

export function useNavigation() {
  const [screen, setScreen] = useState(() => {
    // Cargar pantalla desde localStorage al inicializar
    const savedScreen = localStorage.getItem('currentScreen') || 'buscar'
    return savedScreen === 'list' ? 'lists' : savedScreen
  })
  const [feedback, setFeedback] = useState('')

  // Guardar pantalla en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('currentScreen', screen)
  }, [screen])

  const showFeedback = (message) => {
    setFeedback(message)
    // Auto-hide after 3 seconds
    setTimeout(() => setFeedback(''), 3000)
  }

  return {
    screen,
    setScreen,
    feedback,
    showFeedback,
  }
}
