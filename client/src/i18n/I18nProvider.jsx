import { createContext, useContext, useMemo, useState } from 'react'
import { translations } from './translations'

const I18nContext = createContext(null)

const genreTranslationKeyByToken = {
  action: 'genreAction',
  adventure: 'genreAdventure',
  animation: 'genreAnimation',
  biography: 'genreBiography',
  comedy: 'genreComedy',
  crime: 'genreCrime',
  documentary: 'genreDocumentary',
  drama: 'genreDrama',
  family: 'genreFamily',
  fantasy: 'genreFantasy',
  history: 'genreHistory',
  horror: 'genreHorror',
  music: 'genreMusic',
  musical: 'genreMusical',
  mystery: 'genreMystery',
  romance: 'genreRomance',
  scifi: 'genreSciFi',
  sciencefiction: 'genreSciFi',
  thriller: 'genreThriller',
  war: 'genreWar',
  western: 'genreWestern',
}

function normalizeGenreToken(genre) {
  return String(genre || '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '')
}

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

    const tGenre = (genre) => {
      const token = normalizeGenreToken(genre)
      const key = genreTranslationKeyByToken[token]
      return key ? t(key) : genre
    }

    return {
      language,
      setLanguage,
      t,
      tGenre,
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
