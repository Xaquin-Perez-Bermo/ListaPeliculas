import { useMemo, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { useAuth, useMovies, useSearch, useLocalLists, useNavigation } from './hooks'
import { listsAPI } from './services/api'
import { AuthScreen } from './screens/AuthScreen'
import { SearchScreen } from './screens/searchScreen/SearchScreen'
import { ListScreen } from './screens/lists/ListScreen'
import { UserListsScreen } from './screens/lists/UserListsScreen'
import { MovieDetailModal } from './screens/MovieDetailModal'
import { ActivityScreen } from './screens/ActivityScreen'
import { getTodayDate, groupGenreVetoesByGenre } from './utils/movieUtils'
import { useI18n } from './i18n'
import './App.css'

const LAST_SELECTED_LIST_KEY = 'Pelis Xuntos-last-selected-list'

function applyMovieVetoToList(movieList, movieId, hasMyVeto, username) {
  return movieList.map((m) => {
    if (m.id !== movieId) return m
    const nextVetoedBy = hasMyVeto
      ? (m.vetoedBy || []).filter((u) => u !== username)
      : [...(m.vetoedBy || []), username]
    const hasGenreVeto = (m.genreVetoedBy || []).length > 0
    return { ...m, vetoedBy: nextVetoedBy, isVetoed: nextVetoedBy.length > 0 || hasGenreVeto }
  })
}

function applyGenreVetoToList(movieList, genre, hasMyVeto, username) {
  const genreLower = genre.toLowerCase()
  return movieList.map((m) => {
    const hasGenre = (m.genres || []).some((g) => g.toLowerCase() === genreLower)
    if (!hasGenre) return m
    const prev = m.genreVetoedBy || []
    const next = hasMyVeto
      ? prev.filter((v) => !(v.genre?.toLowerCase() === genreLower && v.username === username))
      : [...prev, { genre, username }]
    return { ...m, genreVetoedBy: next, isVetoed: (m.vetoedBy || []).length > 0 || next.length > 0 }
  })
}

function AppUserControls({ auth, language, setLanguage, t, username }) {
  if (!auth.isAuthenticated) return null

  return (
    <div className="topbar-user">
      <label htmlFor="lang-switch" className="muted small">
        {t('language')}
      </label>
      <select
        id="lang-switch"
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
      >
        <option value="es">ES</option>
        <option value="en">EN</option>
      </select>
      <span className="topbar-username">
        {username ? t('helloUser', { username }) : t('helloGeneric')}
      </span>
      <button onClick={auth.logout}>{t('logout')}</button>
    </div>
  )
}

function AuthenticatedMain({
  navItems,
  screen,
  onTabSelect,
  feedback,
  renderSearch,
  renderLists,
  renderActivity,
  renderModal,
}) {
  return (
    <>
      <nav className="tabbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={screen === item.id ? 'tab active' : 'tab'}
            onClick={() => onTabSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {feedback ? <p className="flash">{feedback}</p> : null}

      <main className="content">
        {screen === 'buscar' ? renderSearch() : null}
        {screen === 'lists' ? renderLists() : null}
        {screen === 'actividad' ? renderActivity() : null}
      </main>

      {renderModal()}
    </>
  )
}

AppUserControls.propTypes = {
  auth: PropTypes.shape({
    isAuthenticated: PropTypes.bool.isRequired,
    logout: PropTypes.func.isRequired,
  }).isRequired,
  language: PropTypes.string.isRequired,
  setLanguage: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  username: PropTypes.string,
}

AppUserControls.defaultProps = {
  username: '',
}

AuthenticatedMain.propTypes = {
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  screen: PropTypes.string.isRequired,
  onTabSelect: PropTypes.func.isRequired,
  feedback: PropTypes.string,
  renderSearch: PropTypes.func.isRequired,
  renderLists: PropTypes.func.isRequired,
  renderActivity: PropTypes.func.isRequired,
  renderModal: PropTypes.func.isRequired,
}

AuthenticatedMain.defaultProps = {
  feedback: '',
}

function App() {
  const { language, setLanguage, t, tGenre } = useI18n()

  // Auth state
  const auth = useAuth()

  // Movies and data state
  const movies = useMovies(auth.token)

  // Search state
  const search = useSearch(movies.movies, movies.logs)

  // Local lists state
  const {
    localLists,
    createList,
    deleteList,
    toggleMovieInLocalList,
    getListsForMovie,
    isMovieSaved,
    serverLists,
    publicLists,
    publicListQuery,
    setPublicListQuery,
    listsLoading,
    subscribeToPublicList,
    subscribeToPrivateList,
    updateListSettings,
  } = useLocalLists()

  // Navigation state
  const { screen, setScreen, feedback, showFeedback } = useNavigation()

  const [selectedListName, setSelectedListName] = useState(null)
  const [selectedListId, setSelectedListId] = useState(null)
  const [selectedListAllowVeto, setSelectedListAllowVeto] = useState(true)
  const [selectedMovieList, setSelectedMovieList] = useState(null)
  const [isOpeningList, setIsOpeningList] = useState(false)
  // Metadatos de la lista seleccionada
  const [selectedListMeta, setSelectedListMeta] = useState({ inviteCode: '', visibility: '', isOwner: false })

  const loadListFromServer = useCallback(async ({ listId, listName }) => {
    const serverList = listId
      ? await listsAPI.getListById(listId).catch(() => null)
      : await listsAPI.getListByName(listName).catch(() => null)

    if (!serverList?.id) {
      return null
    }

    const serverMovies = await listsAPI.getMovies(serverList.id).catch(() => null)
    if (!Array.isArray(serverMovies)) {
      return null
    }

    return {
      movies: serverMovies,
      listId: serverList.id,
      allowVeto: Boolean(serverList.allowVeto),
      meta: {
        inviteCode: serverList.inviteCode || '',
        visibility: serverList.visibility || '',
        isOwner: !!serverList.isOwner,
      },
    }
  }, [])

  const refreshSelectedList = useCallback(async () => {
    if (!selectedListName) return

    const payload = await loadListFromServer({
      listId: selectedListId || null,
      listName: selectedListName,
    })

    if (!payload) return

    setSelectedMovieList(payload.movies)
    setSelectedListId(payload.listId)
    setSelectedListAllowVeto(payload.allowVeto)
    setSelectedListMeta(payload.meta)
  }, [loadListFromServer, selectedListId, selectedListName])

  // Reload selected list on page refresh (screen + listId restored from localStorage but movies are null)
  useEffect(() => {
    if (
      screen === 'lists' &&
      selectedListId &&
      selectedListName &&
      selectedMovieList === null &&
      !isOpeningList
    ) {
      setIsOpeningList(true)
      refreshSelectedList().finally(() => setIsOpeningList(false))
    }
  }, [screen, selectedListId, selectedListName, selectedMovieList, isOpeningList, refreshSelectedList])

  useEffect(() => {
    if (!selectedListId || !selectedListName) return

    localStorage.setItem(
      LAST_SELECTED_LIST_KEY,
      JSON.stringify({
        id: selectedListId,
        name: selectedListName,
        allowVeto: selectedListAllowVeto,
      }),
    )
  }, [selectedListId, selectedListName, selectedListAllowVeto])

  // UI state for shared list screen
  const [showVetoConfig, setShowVetoConfig] = useState(() => {
    // Cargar configuración de veto desde localStorage
    return localStorage.getItem('showVetoConfig') === 'true'
  })

  // Modal state for movie details
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedDetailMovie, setSelectedDetailMovie] = useState(null)

  // Guardar showVetoConfig en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('showVetoConfig', showVetoConfig.toString())
  }, [showVetoConfig])


  const sharedMovieIds = useMemo(
    () => new Set((movies.movies || []).map((movie) => movie.externalId)),
    [movies.movies],
  )

  const watchedMovies = useMemo(
    () => (movies.movies || []).filter((movie) => movie.myRating),
    [movies.movies],
  )

  // Handlers for adding movies to lists
  const handleAddToSharedList = async (movie) => {
    if (sharedMovieIds.has(movie.externalId)) {
      showFeedback(t('alreadySharedFeedback', { title: movie.title }))
      return
    }

    try {
      const success = await movies.addMovie(movie)
      if (success) {
        showFeedback(t('addedToSharedFeedback', { title: movie.title }))
      }
    } catch (error) {
      showFeedback(error.message)
    }
  }

  const handleToggleInLocalList = (listName, movie) => {
    const listNames = getListsForMovie(movie.externalId)
    const isCurrentlySaved = listNames.includes(listName)

    toggleMovieInLocalList(listName, movie)

    showFeedback(
      isCurrentlySaved
        ? t('removedFromListFeedback', { title: movie.title, listName })
        : t('savedInListFeedback', { title: movie.title, listName }),
    )
  }

  // Handlers for genre veto
  const handleToggleGenreVeto = async (genre, hasMyVeto) => {
    const targetListId = selectedListId || undefined
    const username = movies.user?.username
    if (username) setSelectedMovieList((prev) => prev ? applyGenreVetoToList(prev, genre, hasMyVeto, username) : prev)

    const success = hasMyVeto
      ? await movies.removeGenreVeto(genre, targetListId)
      : await movies.addGenreVeto(genre, targetListId)

    if (success) {
      showFeedback(
        hasMyVeto
          ? t('vetoRemovedFeedback', { genre })
          : t('vetoAddedFeedback', { genre }),
      )
      refreshSelectedList()
    }
  }

  const handleToggleMovieVeto = async (movie) => {
    const username = movies.user?.username
    const hasMyVeto = (movie.vetoedBy || []).includes(username)
    if (username) setSelectedMovieList((prev) => prev ? applyMovieVetoToList(prev, movie.id, hasMyVeto, username) : prev)

    if (hasMyVeto) {
      const ok = await movies.unvetoMovie(movie.id, selectedListId || undefined)
      if (ok) refreshSelectedList()
      return
    }

    const ok = await movies.vetoMovie(movie.id, selectedListId || undefined)
    if (ok) refreshSelectedList()
  }

  const handleOpenList = (listName, movies, listId = null, allowVeto = true) => {
    setSelectedListName(listName)
    setSelectedListId(listId)
    setSelectedListAllowVeto(allowVeto)
    setIsOpeningList(true)
    setSelectedMovieList(null)
    setScreen('lists')

    // Try to load fresh list from server when authenticated
    ;(async () => {
      try {
        const payload = await loadListFromServer({ listId, listName })
        if (payload) {
          setSelectedMovieList(payload.movies)
          setSelectedListId(payload.listId)
          setSelectedListAllowVeto(payload.allowVeto)
          setSelectedListMeta(payload.meta)
          return
        }
      } catch (error) {
        console.warn('No se pudo cargar la lista desde el servidor:', error.message)
      } finally {
        setIsOpeningList(false)
      }

      // fallback to provided movies or empty
      setSelectedMovieList(movies || [])
      setSelectedListMeta({ inviteCode: '', visibility: '', isOwner: false })
    })()
  }

  useEffect(() => {
    const saved = localStorage.getItem(LAST_SELECTED_LIST_KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      if (parsed?.id && parsed?.name) {
        setSelectedListId(parsed.id)
        setSelectedListName(parsed.name)
        setSelectedListAllowVeto(Boolean(parsed.allowVeto))
      }
    } catch {
      // ignore invalid payload
    }
  }, [])

  const handleSubscribeToList = async (list) => {
    const ok = await subscribeToPublicList(list.id)
    if (ok) {
      showFeedback(t('subscribedListFeedback', { listName: list.name }))
    }
  }

  const handleSubscribeByInvite = async (rawInviteCode) => {
    const raw = String(rawInviteCode || '').trim()
    if (!raw) {
      showFeedback(t('invalidInviteCode'))
      return false
    }

    let inviteCode = raw

    try {
      if (raw.includes('://')) {
        const parsed = new URL(raw)
        const fromQuery = parsed.searchParams.get('invite')
        if (fromQuery) {
          inviteCode = fromQuery
        } else {
          const parts = parsed.pathname.split('/').filter(Boolean)
          inviteCode = parts.at(-1) || raw
        }
      }
    } catch {
      // raw value is already treated as invite code
    }

    const ok = await subscribeToPrivateList(inviteCode)
    if (ok) {
      showFeedback(t('subscribedByInviteFeedback'))
      return true
    }

    showFeedback(t('invalidInviteCode'))
    return false
  }

  const handleMarkMovieWatched = async (movieId, rating) => {
    const safeRating = Math.max(0.5, Math.min(5, Number(rating) || 3))
    const watchedOn = getTodayDate()
    const ok = await movies.saveRating(movieId, safeRating, watchedOn)

    if (ok) {
      showFeedback(t('ratingSavedFeedback'))
      return true
    }

    showFeedback(t('ratingSaveError'))
    return false
  }

  const handleOpenWatchedList = () => {
    setSelectedListName(t('watchedMoviesTitle'))
    setSelectedListId(null)
    setSelectedListAllowVeto(false)
    setSelectedMovieList(watchedMovies)
    setScreen('lists')
  }

  const handleBackToListsHub = () => {
    setSelectedListName(null)
    setSelectedListId(null)
    setSelectedMovieList(null)
    setSelectedListAllowVeto(true)
    setIsOpeningList(false)
  }

  const handleTabSelect = (nextScreen) => {
    // If the user is already in Lists, clicking the same tab acts as "back to lists hub".
    // If coming from another tab, preserve the last selected list detail.
    if (nextScreen === 'lists' && screen === 'lists') {
      handleBackToListsHub()
    }

    setScreen(nextScreen)
  }

  const handleUpdateListSettings = async (listId, payload) => {
    const ok = await updateListSettings(listId, payload)
    if (ok) {
      showFeedback(t('listSettingsSavedFeedback'))
      return true
    }

    showFeedback(t('listSettingsSaveError'))
    return false
  }

  const groupedGenreVetoes = useMemo(
    () => {
      if (selectedListId && Array.isArray(selectedMovieList)) {
        const vetoRows = selectedMovieList.flatMap((movie) => movie.genreVetoedBy || [])
        return groupGenreVetoesByGenre(vetoRows)
      }

      return groupGenreVetoesByGenre(movies.genreVetoes)
    },
    [movies.genreVetoes, selectedListId, selectedMovieList],
  )

  const navItems = [
    { id: 'buscar', label: t('tabSearch') },
    { id: 'lists', label: t('lists') },
    { id: 'actividad', label: t('tabActivity') },
  ]

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>{t('appTitle')}</h1>
          <p className="muted">{t('appSubtitle')}</p>
        </div>
        <AppUserControls
          auth={auth}
          language={language}
          setLanguage={setLanguage}
          t={t}
          username={movies.user?.username || auth.user?.username || ''}
        />
      </header>

      {auth.isAuthenticated ? (
        <AuthenticatedMain
          navItems={navItems}
          screen={screen}
          onTabSelect={handleTabSelect}
          feedback={feedback}
          renderSearch={() => (
            <SearchScreen
              search={search}
              lists={{
                localLists,
                getListsForMovie,
                isMovieSaved,
                isInSharedList: (externalId) => sharedMovieIds.has(externalId),
              }}
              listActions={{
                onToggleInLocalList: handleToggleInLocalList,
                onCreateList: createList,
                onDeleteList: deleteList,
                onAddToList: handleAddToSharedList,
              }}
              listDiscovery={{
                publicLists,
                publicListQuery,
                onPublicSearchChange: setPublicListQuery,
                onSubscribeToList: handleSubscribeToList,
                currentUsername: movies.user?.username || auth.user?.username || '',
              }}
              i18n={{ t, tGenre }}
            />
          )}
          renderLists={() => (
            selectedListName ? (
              <ListScreen
                movies={selectedMovieList || []}
                isLoading={isOpeningList}
                listName={selectedListName}
                statusFilter={movies.statusFilter}
                setStatusFilter={movies.setStatusFilter}
                showVetoConfig={selectedListAllowVeto ? showVetoConfig : false}
                setShowVetoConfig={setShowVetoConfig}
                groupedGenreVetoes={groupedGenreVetoes}
                currentUsername={movies.user?.username || ''}
                onToggleGenreVeto={handleToggleGenreVeto}
                onToggleMovieVeto={handleToggleMovieVeto}
                canConfigureVeto={selectedListAllowVeto}
                onBackToLists={handleBackToListsHub}
                onMarkWatched={handleMarkMovieWatched}
                t={t}
                tGenre={tGenre}
                onOpenDetail={(movieOrId) => {
                  const movieFromParam =
                    movieOrId && typeof movieOrId === 'object' ? movieOrId : null

                  const resolvedMovie =
                    movieFromParam ||
                    (selectedMovieList || []).find((movie) => movie.id === movieOrId) ||
                    null

                  const resolvedMovieId = resolvedMovie?.id || movieOrId || null

                  if (!resolvedMovieId) {
                    return
                  }

                  setSelectedDetailMovie(resolvedMovie)
                  movies.setSelectedMovieId(resolvedMovieId)
                  setShowDetailModal(true)
                }}
                // Props nuevos para metadatos de lista
                inviteCode={selectedListMeta.inviteCode}
                visibility={selectedListMeta.visibility}
                isOwner={selectedListMeta.isOwner}
              />
            ) : (
              <UserListsScreen
                localLists={localLists}
                serverLists={serverLists}
                isLoading={listsLoading}
                onOpenWatchedList={handleOpenWatchedList}
                watchedMoviesCount={watchedMovies.length}
                onUpdateListSettings={handleUpdateListSettings}
                onCreateList={createList}
                onDeleteList={deleteList}
                onOpenList={handleOpenList}
                onSubscribeByInvite={handleSubscribeByInvite}
                t={t}
              />
            )
          )}
          renderActivity={() => <ActivityScreen logs={movies.logs} t={t} />}
          renderModal={() => (showDetailModal ? (
            <MovieDetailModal
              selectedMovie={movies.selectedMovie || selectedDetailMovie}
              onClose={() => {
                setShowDetailModal(false)
                setSelectedDetailMovie(null)
              }}
              t={t}
              tGenre={tGenre}
            />
          ) : null)}
        />
      ) : (
        <AuthScreen
          authMode={auth.authMode}
          setAuthMode={auth.setAuthMode}
          username={auth.username}
          setUsername={auth.setUsername}
          password={auth.password}
          setPassword={auth.setPassword}
          authError={auth.authError}
          onSubmit={auth.handleAuthSubmit}
          t={t}
        />
      )}
    </div>
  )
}

export default App

