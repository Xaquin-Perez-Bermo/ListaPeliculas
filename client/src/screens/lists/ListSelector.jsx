/**
 * ListSelector - Selector para añadir películas a listas
 */

import { useState } from 'react'

function ListSelector({
  localLists,
  selectedListNames,
  isInSharedList,
  onToggleInList,
  onCreateList,
  onDeleteList,
  onAddToSharedList,
  t,
}) {
  const [newListName, setNewListName] = useState('')
  const [showNewListInput, setShowNewListInput] = useState(false)
  const selectedSet = new Set(selectedListNames || [])

  const handleCreateList = (e) => {
    e.preventDefault()
    if (!newListName.trim()) return

    if (onCreateList(newListName.trim())) {
      setNewListName('')
      setShowNewListInput(false)
    }
  }

  const handleToggleInLocalList = (listName) => {
    onToggleInList(listName)
  }

  return (
    <div className="list-selector">
      <h4>{t('saveIn')}</h4>

      <div className="lists-container">
        {/* Shared list */}
        <button
          className={`list-option ${isInSharedList ? 'saved' : ''}`}
          onClick={() => onAddToSharedList()}
          title={t('addToShared')}
          type="button"
        >
          📋 {isInSharedList ? t('alreadyInShared') : t('sharedList')}
        </button>

        {/* Local lists */}
        {Object.keys(localLists).map((listName) => {
          const isDeletable = listName !== 'favoritas'
          const isSaved = selectedSet.has(listName)

          return (
            <div key={listName} className="list-option-wrapper">
              <button
                className={`list-option ${isSaved ? 'saved' : ''}`}
                onClick={() => handleToggleInLocalList(listName)}
                title={listName}
                type="button"
              >
                {listName === 'favoritas' ? '⭐' : '📝'} {listName} ·{' '}
                {isSaved ? t('removeFromList') : t('addToList')}
              </button>
              {isDeletable ? (
                <button
                  className="list-delete-btn"
                  onClick={() => onDeleteList(listName)}
                  title={t('deleteList', { listName })}
                  type="button"
                >
                  ✕
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Create new list */}
      {showNewListInput ? (
        <form onSubmit={handleCreateList} className="new-list-form">
          <input
            type="text"
            placeholder={t('listNamePlaceholder')}
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            autoFocus
            maxLength={30}
          />
          <button type="submit" className="confirm-btn">
            {t('createList')}
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={() => {
              setShowNewListInput(false)
              setNewListName('')
            }}
          >
            {t('cancel')}
          </button>
        </form>
      ) : (
        <button
          className="create-list-btn"
          onClick={() => setShowNewListInput(true)}
          type="button"
        >
          + {t('newList')}
        </button>
      )}
    </div>
  )
}

export default ListSelector
