import { useMemo, useState, useEffect } from 'react'
import { useAuth, useMovies, useSearch, useLocalLists, useNavigation } from './hooks'
import { AuthScreen } from './screens/AuthScreen'
import { SearchScreen } from './screens/searchScreen/SearchScreen'
import { SharedListScreen } from './screens/lists/SharedListScreen'
import { MyListsScreen } from './screens/lists/MyListsScreen'
import { MovieDetailModal } from './screens/MovieDetailModal'
import { WatchedMoviesScreen } from './screens/WatchedMoviesScreen'
import { ActivityScreen } from './screens/ActivityScreen'
import { getTodayDate, groupGenreVetoesByGenre } from './utils/movieUtils'
import { useI18n } from './i18n'
import './App.css'

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
  } = useLocalLists()

  // Navigation state
  const { screen, setScreen, feedback, showFeedback } = useNavigation()

  // Rating inputs for the detail screen
  const [ratingInputs, setRatingInputs] = useState({})


  // UI state for shared list screen
  const [showVetoConfig, setShowVetoConfig] = useState(() => {
    // Cargar configuración de veto desde localStorage
    return localStorage.getItem('showVetoConfig') === 'true'
  })

  // Modal state for movie details
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Guardar showVetoConfig en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('showVetoConfig', showVetoConfig.toString())
  }, [showVetoConfig])


  const sharedMovieIds = useMemo(
    () => new Set((movies.movies || []).map((movie) => movie.externalId)),
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
    const success = hasMyVeto
      ? await movies.removeGenreVeto(genre)
      : await movies.addGenreVeto(genre)

    if (success) {
      showFeedback(
        hasMyVeto
          ? t('vetoRemovedFeedback', { genre })
          : t('vetoAddedFeedback', { genre }),
      )
    }
  }

  const handleToggleMovieVeto = async (movie) => {
    const hasMyVeto = (movie.vetoedBy || []).includes(movies.user?.username)
    if (hasMyVeto) {
      await movies.unvetoMovie(movie.id)
      return
    }

    await movies.vetoMovie(movie.id)
  }

  // Handlers for ratings
  const getRatingState = (movie) => {
    return (
      ratingInputs[movie.id] || {
        rating: movie.myRating || 3,
        watchedOn: movie.myWatchedOn || getTodayDate(),
      }
    )
  }

  const handleRatingChange = (movieId, updates) => {
    const current = getRatingState(movies.selectedMovie)
    setRatingInputs((prev) => ({
      ...prev,
      [movieId]: {
        ...current,
        ...updates,
      },
    }))
  }

  const handleSaveRating = async (movieId) => {
    const current = ratingInputs[movieId] || { rating: 3, watchedOn: getTodayDate() }
    const success = await movies.saveRating(movieId, current.rating, current.watchedOn)
    if (success) {
      showFeedback(t('ratingSavedFeedback'))
      setRatingInputs((prev) => {
        const next = { ...prev }
        delete next[movieId]
        return next
      })
    }
  }

  const handleClearWatched = async (movieId) => {
    const success = await movies.clearRating(movieId)
    if (success) {
      showFeedback(t('unwatchedFeedback'))
      setRatingInputs((prev) => {
        const next = { ...prev }
        delete next[movieId]
        return next
      })
    }
  }

  // Memoized values
  const groupedGenreVetoes = useMemo(
    () => groupGenreVetoesByGenre(movies.genreVetoes),
    [movies.genreVetoes],
  )

  const navItems = [
    { id: 'buscar', label: t('tabSearch') },
    { id: 'lista', label: t('tabShared') },
    { id: 'vistas', label: t('tabWatched') },
    { id: 'mis-listas', label: t('tabMyLists') },
    { id: 'actividad', label: t('tabActivity') },
  ]

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>{t('appTitle')}</h1>
          <p className="muted">{t('appSubtitle')}</p>
        </div>

        {movies.user ? (
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
            <span>{t('helloUser', { username: movies.user.username })}</span>
            <button onClick={auth.logout}>{t('logout')}</button>
          </div>
        ) : null}
      </header>

      {auth.isAuthenticated ? (
        <>
          <nav className="tabbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={screen === item.id ? 'tab active' : 'tab'}
                onClick={() => setScreen(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {feedback ? <p className="flash">{feedback}</p> : null}

          <main className="content">
            {screen === 'buscar' ? (
              <SearchScreen
                searchMode={search.searchMode}
                setSearchMode={search.setSearchMode}
                discoverQuery={search.discoverQuery}
                setDiscoverQuery={search.setDiscoverQuery}
                discoverResults={search.discoverResults}
                discoverError={search.discoverError}
                handleDiscover={search.handleDiscover}
                internalQuery={search.internalQuery}
                setInternalQuery={search.setInternalQuery}
                internalResults={search.internalResults}
                selectedSearchMovie={search.selectedSearchMovie}
                watchmodeData={search.watchmodeData}
                watchmodeDataById={search.watchmodeDataById}
                watchmodeLoading={search.watchmodeLoading}
                watchmodeError={search.watchmodeError}
                fetchWatchmodeData={search.fetchWatchmodeData}
                localLists={localLists}
                onToggleInLocalList={handleToggleInLocalList}
                getListsForMovie={getListsForMovie}
                isMovieSaved={isMovieSaved}
                isInSharedList={(externalId) => sharedMovieIds.has(externalId)}
                onCreateList={createList}
                onDeleteList={deleteList}
                onAddToSharedList={handleAddToSharedList}
                isSearching={search.isSearching}
                t={t}
                tGenre={tGenre}
              />
            ) : null}

            {screen === 'lista' ? (
              <SharedListScreen
                movies={movies.movies}
                statusFilter={movies.statusFilter}
                setStatusFilter={movies.setStatusFilter}
                showVetoConfig={showVetoConfig}
                setShowVetoConfig={setShowVetoConfig}
                groupedGenreVetoes={groupedGenreVetoes}
                currentUsername={movies.user?.username || ''}
                onToggleGenreVeto={handleToggleGenreVeto}
                onToggleMovieVeto={handleToggleMovieVeto}
                t={t}
                tGenre={tGenre}
                onOpenDetail={(movieId) => {
                  movies.setSelectedMovieId(movieId)
                  setShowDetailModal(true)
                }}
              />
            ) : null}

            {screen === 'mis-listas' ? (
              <MyListsScreen
                localLists={localLists}
                onCreateList={createList}
                onDeleteList={deleteList}
                t={t}
              />
            ) : null}

            {screen === 'vistas' ? (
              <WatchedMoviesScreen
                movies={movies.movies}
                currentUsername={movies.user?.username || ''}
                t={t}
                onOpenDetail={(movieId) => {
                  movies.setSelectedMovieId(movieId)
                  setShowDetailModal(true)
                }}
                tGenre={tGenre}
              />
            ) : null}

            {screen === 'actividad' ? <ActivityScreen logs={movies.logs} t={t} /> : null}
          </main>

          {showDetailModal ? (
            <MovieDetailModal
              selectedMovie={movies.selectedMovie}
              detailRatings={movies.detailRatings}
              ratingState={getRatingState(movies.selectedMovie || {})}
              onRatingChange={(updates) =>
                handleRatingChange(movies.selectedMovieId, updates)
              }
              onSaveRating={handleSaveRating}
              onClearWatched={handleClearWatched}
              onClose={() => setShowDetailModal(false)}
              t={t}
              tGenre={tGenre}
            />
          ) : null}

        </>
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

