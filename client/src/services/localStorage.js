/**
 * Local Storage Service
 */

const LOCAL_LISTS_KEY = 'Pelis Xuntos-local-lists'

export const DEFAULT_LOCAL_LISTS = {
  favoritas: [],
}

export function loadLocalLists() {
  const saved = localStorage.getItem(LOCAL_LISTS_KEY)
  if (!saved) return DEFAULT_LOCAL_LISTS

  try {
    const parsed = JSON.parse(saved)
    // Ensure 'favoritas' always exists
    return {
      favoritas: Array.isArray(parsed.favoritas) ? parsed.favoritas : [],
      ...Object.keys(parsed).reduce((acc, key) => {
        if (key !== 'favoritas' && Array.isArray(parsed[key])) {
          acc[key] = parsed[key]
        }
        return acc
      }, {}),
    }
  } catch {
    return DEFAULT_LOCAL_LISTS
  }
}

export function saveLocalLists(lists) {
  localStorage.setItem(LOCAL_LISTS_KEY, JSON.stringify(lists))
}
