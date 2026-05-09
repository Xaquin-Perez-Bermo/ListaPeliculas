/**
 * useNavigation Hook - Maneja la navegación entre pantallas
 */

import { useState } from 'react'

export function useNavigation() {
  const [screen, setScreen] = useState('buscar')
  const [feedback, setFeedback] = useState('')

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
