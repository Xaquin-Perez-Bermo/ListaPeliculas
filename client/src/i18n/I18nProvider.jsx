import { createContext, useContext, useMemo, useState } from 'react'
import { translations } from './translations'

const I18nContext = createContext(null)
/* eslint-disable react/prop-types */

function interpolate(template, vars = {}) {
  return Object.entries(vars).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{{${key}}}`, String(value))
  }, template)
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState('es')

  const value = useMemo(() => {
    const dict = translations[language] || translations.es

    const t = (key, vars) => {
      const candidate = dict[key] ?? translations.es[key] ?? key
      return typeof candidate === 'string' ? interpolate(candidate, vars) : key
    }

    return {
      language,
      setLanguage,
      t,
    }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
