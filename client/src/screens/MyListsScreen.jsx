/**
 * MyListsScreen - Pantalla de listas locales
 */
/* eslint-disable react/prop-types */
import { useState } from 'react'
// eslint-disable-next-line react/prop-types
export function MyListsScreen({ localLists, onCreateList, onDeleteList, t }) {
  const [newListName, setNewListName] = useState('')

  const handleCreateList = (e) => {
    e.preventDefault()
    if (onCreateList(newListName.trim())) {
      setNewListName('')
    }
  }
  return (
    <section className="panel">
      <h2>{t('myLocalLists')}</h2>

      <div className="grid-2">
        {Object.entries(localLists).map(([listName, listMovies]) => {
          const canDeleteList = listName !== 'favoritas'
          return (
            <article key={listName} className="subpanel">
              <div className="list-header">
                <h3>{listName}</h3>
                {canDeleteList ? (
                  <button
                    className="delete-list-btn"
                    onClick={() => onDeleteList(listName)}
                    title={t('deleteList', { listName })}
                    type="button"
                  >
                    🗑️
                  </button>
                ) : null}
              </div>
              <ul className="result-list">
                {listMovies.length ? (
                  listMovies.map((movie) => (
                    <li
                      key={`${listName}-${movie.externalId}`}
                      className="movie-card compact"
                    >
                      <div className="movie-main">
                        <strong>{movie.title}</strong>
                        <p>{movie.year || t('naLabel')}</p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="muted">{t('emptyList')}</li>
                )}
              </ul>
            </article>
          )
        })}
      </div>

      <form onSubmit={handleCreateList} className="create-list-section">
        <h3>{t('createNewList')}</h3>
        <div className="form-row">
          <input
            type="text"
            placeholder={t('listNamePlaceholder')}
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            maxLength={30}
          />
          <button type="submit" disabled={!newListName.trim()}>
            {t('createList')}
          </button>
        </div>
      </form>
    </section>
  )
}
