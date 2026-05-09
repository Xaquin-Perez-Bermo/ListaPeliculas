/**
 * WatchmodePanel - Panel con info de la película de Watchmode
 */
/* eslint-disable react/prop-types, sonarjs/cognitive-complexity */
import { useState } from 'react'
import ListSelector from './ListSelector'

function WatchmodePanel({
  selectedSearchMovie,
  watchmodeData,
  watchmodeLoading,
  watchmodeError,
  onClose,
  localLists,
  onToggleInLocalList,
  getListsForMovie,
  isMovieSaved,
  isInSharedList,
  onCreateList,
  onDeleteList,
  onAddToSharedList,
  t,
}) {
  const [showListSelector, setShowListSelector] = useState(false)
  const savedLocalLists = getListsForMovie(selectedSearchMovie?.externalId)
  const isSavedLocally = isMovieSaved(selectedSearchMovie?.externalId)
  const isSavedAnywhere =
    isSavedLocally || isInSharedList(selectedSearchMovie?.externalId)
  return (
    <aside className="watchmode-panel">
      <div className="panel-head">
        <h3>
          {selectedSearchMovie.title}{' '}
          {selectedSearchMovie.year ? `(${selectedSearchMovie.year})` : ''}
        </h3>
        <button className="ghost" onClick={onClose} title={t('close')}>
          ✕
        </button>
      </div>

      {watchmodeLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p className="muted">⏳ {t('watchmodeLoading')}</p>
        </div>
      ) : null}
      {watchmodeError ? <p className="error">{watchmodeError}</p> : null}

      {watchmodeData ? (
        <>
          {watchmodeData.poster ? (
            <img
              src={watchmodeData.poster}
              alt={watchmodeData.title}
              className="wm-poster"
            />
          ) : null}

          <div className="chip-row">
            {(watchmodeData.genre_names || selectedSearchMovie.genres).map((genre) => (
              <span key={`wm-${genre}`} className="chip">
                {genre}
              </span>
            ))}
          </div>

          <div className="wm-meta">
            {watchmodeData.runtime_minutes ? (
              <span>⏱️ {watchmodeData.runtime_minutes} min</span>
            ) : null}
            {watchmodeData.us_rating ? (
              <span className="chip">{watchmodeData.us_rating}</span>
            ) : null}
            {watchmodeData.user_rating ? (
              <span>⭐ {watchmodeData.user_rating}/10</span>
            ) : null}
            {watchmodeData.critic_score ? (
              <span>🎯 Crítica: {watchmodeData.critic_score}/100</span>
            ) : null}
          </div>

          {watchmodeData.plot_overview ? (
            <p className="wm-plot">{watchmodeData.plot_overview}</p>
          ) : null}

          {watchmodeData.sources?.length ? (
            <>
              <h4>{t('availableOn')}</h4>
              <div className="source-chips">
                {[...new Map(watchmodeData.sources.map((s) => [s.name, s])).values()].map(
                  (source) => {
                    let suffix = ''
                    if (source.type === 'rent') suffix = ` (${t('sourceRent')})`
                    else if (source.type === 'buy') suffix = ` (${t('sourceBuy')})`

                    return (
                      <a
                        key={source.source_id}
                        href={source.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-chip"
                      >
                        {source.name}
                        {suffix}
                      </a>
                    )
                  },
                )}
              </div>
            </>
          ) : (
            <p className="muted">{t('notStreaming')}</p>
          )}

          <div className="wm-actions">
            <button
              onClick={() => setShowListSelector(true)}
              className={isSavedAnywhere ? 'saved' : ''}
              type="button"
            >
              {isSavedAnywhere ? t('savedButton') : t('saveFromInfo')}
            </button>
          </div>

          {showListSelector ? (
            <ListSelector
              localLists={localLists}
              selectedListNames={savedLocalLists}
              isInSharedList={isInSharedList(selectedSearchMovie.externalId)}
              onToggleInList={(listName) => {
                onToggleInLocalList(listName, selectedSearchMovie)
              }}
              onCreateList={onCreateList}
              onDeleteList={onDeleteList}
              onAddToSharedList={() => {
                onAddToSharedList(selectedSearchMovie)
              }}
              t={t}
            />
          ) : null}
        </>
      ) : null}

      {!watchmodeLoading && !watchmodeData && !watchmodeError ? (
        <p className="muted">{t('clickMovieToLoad')}</p>
      ) : null}
    </aside>
  )
}

export default WatchmodePanel
