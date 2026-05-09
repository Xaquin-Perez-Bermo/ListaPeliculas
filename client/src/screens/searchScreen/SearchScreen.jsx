/**
 * SearchScreen - Pantalla de búsqueda
 */
import SearchMovieCard from '../../components/search/SearchMovieCard'
import WatchmodePanel from '../WatchmodePanel'
import ListSelector from '../lists/ListSelector'
import { useState } from 'react'

function ExternalSearchSection({
  discoverQuery,
  setDiscoverQuery,
  discoverResults,
  discoverError,
  handleDiscover,
  selectedSearchMovie,
  watchmodeData,
  watchmodeDataById = {},
  watchmodeLoading,
  watchmodeError,
  fetchWatchmodeData,
  isSearching,
  localLists,
  onToggleInLocalList,
  getListsForMovie,
  isMovieSaved,
  isInSharedList,
  onCreateList,
  onDeleteList,
  onAddToSharedList,
  t,
  tGenre,
}) {
  const [likeTargetMovie, setLikeTargetMovie] = useState(null)
  const [showWatchmodePanel, setShowWatchmodePanel] = useState(false)
  return (
    <>
      <form onSubmit={handleDiscover} className="inline-form">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={discoverQuery}
          onChange={(event) => setDiscoverQuery(event.target.value)}
          required
        />
        <button type="submit" disabled={isSearching}>
          {isSearching ? `🔍 ${t('searchingButton')}` : t('searchButton')}
        </button>
      </form>

      {discoverError ? <p className="error">{discoverError}</p> : null}
      {isSearching ? <p className="muted">⏳ {t('searchingButton')}</p> : null}

      {discoverResults.length > 0 ? (
        <>
          <div className="search-layout">
            <ul className="result-list search-results-col">
              {discoverResults.map((movie) => {
                  const watchmodeKey = movie.externalId || `${movie.title}-${movie.year}`
                  const savedInLists = getListsForMovie(movie.externalId)
                  const hasSavedLocal = savedInLists.length > 0
                  const hasSavedAnywhere = hasSavedLocal || isInSharedList(movie.externalId)
                  return (
                <SearchMovieCard
                  key={movie.externalId || movie.id || movie.title}
                  movie={movie}
                  setLikeTargetMovie={setLikeTargetMovie}
                  t={t}
                  tGenre={tGenre}
                  fetchWatchmodeData={(movie) => {
                    fetchWatchmodeData(movie)
                    setShowWatchmodePanel(true)
                  }}
                  selectedSearchMovie={selectedSearchMovie}
                  watchmodeData={watchmodeDataById?.[watchmodeKey]}
                  hasSavedAnywhere={hasSavedAnywhere}
                />
                  )
                })}
            </ul>

            {showWatchmodePanel && selectedSearchMovie ? (
              <>
                <button
                  className="watchmode-backdrop"
                  onClick={() => setShowWatchmodePanel(false)}
                  type="button"
                  aria-label={t('closePanelAria')}
                  title={t('closeByClickTitle')}
                />
                <WatchmodePanel
                  selectedSearchMovie={selectedSearchMovie}
                  watchmodeData={watchmodeData}
                  watchmodeLoading={watchmodeLoading}
                  watchmodeError={watchmodeError}
                  onClose={() => setShowWatchmodePanel(false)}
                  localLists={localLists}
                  onToggleInLocalList={onToggleInLocalList}
                  getListsForMovie={getListsForMovie}
                  isMovieSaved={isMovieSaved}
                  isInSharedList={isInSharedList}
                  onCreateList={onCreateList}
                  onDeleteList={onDeleteList}
                  onAddToSharedList={onAddToSharedList}
                  t={t}
                  tGenre={tGenre}
                />
              </>
            ) : null}
          </div>

          {likeTargetMovie ? (
            <>
              <button
                className="like-selector-backdrop"
                onClick={() => setLikeTargetMovie(null)}
                type="button"
                aria-label={t('closeListSelectorAria')}
              />
              <div className="like-selector-panel">
                <h3>{t('saveMovieTitle', { title: likeTargetMovie.title })}</h3>
                <ListSelector
                  localLists={localLists}
                  selectedListNames={getListsForMovie(likeTargetMovie.externalId)}
                  isInSharedList={isInSharedList(likeTargetMovie.externalId)}
                  onToggleInList={(listName) => {
                    onToggleInLocalList(listName, likeTargetMovie)
                  }}
                  onCreateList={onCreateList}
                  onDeleteList={onDeleteList}
                  onAddToSharedList={() => {
                    onAddToSharedList(likeTargetMovie)
                  }}
                  t={t}
                />
                <button
                  className="close-btn accept-btn"
                  onClick={() => setLikeTargetMovie(null)}
                  type="button"
                >
                  {t('accept')}
                </button>
                <button
                  className="close-btn ghost"
                  onClick={() => setLikeTargetMovie(null)}
                  type="button"
                >
                  {t('cancel')}
                </button>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </>
  )
}

function InternalSearchSection({ internalQuery, setInternalQuery, internalResults, t, tGenre }) {
  const { movies: internalMovies, logs: internalLogs } = internalResults

  return (
    <>
      <input
        className="search-input-full"
        type="text"
        placeholder={t('internalSearchPlaceholder')}
        value={internalQuery}
        onChange={(event) => setInternalQuery(event.target.value)}
      />

      {internalQuery.trim() ? (
        <>
          {internalMovies.length > 0 ? (
            <>
              <h3 className="section-label">
                {t('tabShared')} ({internalMovies.length})
              </h3>
              <ul className="result-list">
                {internalMovies.map((movie) => (
                  <li key={movie.id} className="movie-card">
                    <div className="movie-main">
                      <strong>
                        {movie.title} {movie.year ? `(${movie.year})` : ''}
                      </strong>
                      <div className="chip-row">
                        {movie.genres.map((genre) => (
                          <span key={`int-${movie.id}-${genre}`} className="chip">
                            {tGenre(genre)}
                          </span>
                        ))}
                      </div>
                      <p className="muted small">{t('addedByLabel')} {movie.createdBy}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {internalLogs.length > 0 ? (
            <>
              <h3 className="section-label">
                {t('tabActivity')} ({internalLogs.length})
              </h3>
              <ul className="result-list">
                {internalLogs.map((log) => (
                  <li key={log.id} className="movie-card compact">
                    <div className="movie-main">
                      <strong>{log.action}</strong>
                      <p className="muted small">
                        {log.username || t('systemUser')} ·{' '}
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {internalMovies.length === 0 && internalLogs.length === 0 ? (
            <p className="muted">{t('internalNoResults', { query: internalQuery })}</p>
          ) : null}
        </>
      ) : (
        <p className="muted">{t('internalSearchHint')}</p>
      )}
    </>
  )
}

export function SearchScreen({
  searchMode,
  setSearchMode,
  discoverQuery,
  setDiscoverQuery,
  discoverResults,
  discoverError,
  handleDiscover,
  internalQuery,
  setInternalQuery,
  internalResults,
  selectedSearchMovie,
  watchmodeData,
  watchmodeDataById,
  watchmodeLoading,
  watchmodeError,
  fetchWatchmodeData,
  isSearching,
  localLists,
  onToggleInLocalList,
  getListsForMovie,
  isMovieSaved,
  isInSharedList,
  onCreateList,
  onDeleteList,
  onAddToSharedList,
  t,
  tGenre,
}) {
  return (
    <section className="panel">
      <h2>{t('searchTitle')}</h2>

      <div className="search-mode-bar">
        <button
          className={searchMode === 'externa' ? 'tab-sm active' : 'tab-sm'}
          onClick={() => setSearchMode('externa')}
        >
          {t('externalCatalog')}
        </button>
        <button
          className={searchMode === 'interna' ? 'tab-sm active' : 'tab-sm'}
          onClick={() => setSearchMode('interna')}
        >
          {t('inMyLists')}
        </button>
      </div>

      {searchMode === 'externa' ? (
        <ExternalSearchSection
          discoverQuery={discoverQuery}
          setDiscoverQuery={setDiscoverQuery}
          discoverResults={discoverResults}
          discoverError={discoverError}
          handleDiscover={handleDiscover}
          selectedSearchMovie={selectedSearchMovie}
          watchmodeData={watchmodeData}
          watchmodeDataById={watchmodeDataById}
          watchmodeLoading={watchmodeLoading}
          watchmodeError={watchmodeError}
          fetchWatchmodeData={fetchWatchmodeData}
          isSearching={isSearching}
          localLists={localLists}
          onToggleInLocalList={onToggleInLocalList}
          getListsForMovie={getListsForMovie}
          isMovieSaved={isMovieSaved}
          isInSharedList={isInSharedList}
          onCreateList={onCreateList}
          onDeleteList={onDeleteList}
          onAddToSharedList={onAddToSharedList}
          t={t}
          tGenre={tGenre}
        />
      ) : (
        <InternalSearchSection
          internalQuery={internalQuery}
          setInternalQuery={setInternalQuery}
          internalResults={internalResults}
          t={t}
          tGenre={tGenre}
        />
      )}
    </section>
  )
}

