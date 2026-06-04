/**
 * MyListsScreen - Pantalla de listas locales
 */
import { useState } from 'react'
import PropTypes from 'prop-types'
export function UserListsScreen({
  localLists,
  serverLists,
  isLoading,
  onOpenWatchedList,
  watchedMoviesCount,
  onUpdateListSettings,
  onCreateList,
  onDeleteList,
  onOpenList,
  onSubscribeByInvite,
  t,
}) {
  const [newListName, setNewListName] = useState('')
  const [newVisibility, setNewVisibility] = useState('personal')
  const [allowVeto, setAllowVeto] = useState(true)
  const [allowMemberAdd, setAllowMemberAdd] = useState(true)
  const [allowMemberVeto, setAllowMemberVeto] = useState(true)
  const [description, setDescription] = useState('')
  const [createCoverUrl, setCreateCoverUrl] = useState('')
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [editingListId, setEditingListId] = useState(null)
  const [showCreateListPanel, setShowCreateListPanel] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [editVisibility, setEditVisibility] = useState('personal')
  const [editAllowVeto, setEditAllowVeto] = useState(true)
  const [editAllowMemberAdd, setEditAllowMemberAdd] = useState(true)
  const [editAllowMemberVeto, setEditAllowMemberVeto] = useState(true)
  const [editCoverUrl, setEditCoverUrl] = useState('')

  const handleCreateList = (e) => {
    e.preventDefault()
    if (
      onCreateList(newListName.trim(), {
        visibility: newVisibility,
        allowVeto,
        allowMemberAdd,
        allowMemberVeto,
        description,
        coverUrl: createCoverUrl,
      })
    ) {
      setNewListName('')
      setDescription('')
      setCreateCoverUrl('')
      setNewVisibility('personal')
      setAllowVeto(true)
      setAllowMemberAdd(true)
      setAllowMemberVeto(true)
      setShowCreateListPanel(false)
    }
  }

  const byName = (serverLists || []).reduce((acc, item) => {
    const current = acc[item.name]
    if (!current || item.isOwner || (!current.isOwner && item.isMember)) {
      acc[item.name] = item
    }
    return acc
  }, {})

  const startEditing = (listMeta) => {
    setEditingListId(listMeta.id)
    setEditDescription(listMeta.description || '')
    setEditVisibility(listMeta.visibility || (listMeta.isPublic ? 'public' : 'personal'))
    setEditAllowVeto(Boolean(listMeta.allowVeto))
    setEditAllowMemberAdd(Boolean(listMeta.allowMemberAdd))
    setEditAllowMemberVeto(Boolean(listMeta.allowMemberVeto))
    setEditCoverUrl(listMeta.coverUrl || '')
  }

  const cancelEditing = () => {
    setEditingListId(null)
    setEditDescription('')
    setEditVisibility('personal')
    setEditAllowVeto(true)
    setEditAllowMemberAdd(true)
    setEditAllowMemberVeto(true)
    setEditCoverUrl('')
  }

  const saveSettings = async () => {
    if (!editingListId) return
    const ok = await onUpdateListSettings(editingListId, {
      description: editDescription,
      visibility: editVisibility,
      allowVeto: editAllowVeto,
      allowMemberAdd: editAllowMemberAdd,
      allowMemberVeto: editAllowMemberVeto,
      coverUrl: editCoverUrl,
    })
    if (ok) {
      cancelEditing()
    }
  }

  const handleInviteSubscribe = async (event) => {
    event.preventDefault()
    const ok = await onSubscribeByInvite(inviteCodeInput)
    if (ok) {
      setInviteCodeInput('')
    }
  }

  const getVisibilityLabel = (visibility) => {
    if (visibility === 'public') return t('listVisibilityPublic')
    if (visibility === 'private') return t('listVisibilityPrivate')
    return t('listVisibilityPersonal')
  }

  const editingMeta = Object.values(byName).find((item) => item.id === editingListId) || null
  const privateInviteLink = editingMeta?.inviteCode
    ? `${globalThis.location.origin}/invite/${editingMeta.inviteCode}`
    : ''

  return (
    <section className="panel">
      <h2>{t('myLocalLists')}</h2>
      {isLoading ? <p className="muted">{t('loadingLists')}</p> : null}

      <div className="list-grid">
        <article className="subpanel list-card watched-list-card">
          <button
            type="button"
            className="link-button"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={onOpenWatchedList}
          >
            <div className="list-card-cover-wrap watched-cover">
              <div className="list-card-cover placeholder">{t('watchedMoviesTitle')}</div>
            </div>
            <div className="list-header">
              <h3>{t('watchedMoviesTitle')}</h3>
            </div>
            <p className='muted'> {t('moviesInList', { count: watchedMoviesCount })}</p>
          </button>
        </article>

        {Object.entries(localLists).map(([listName, listMovies]) => {
          const canDeleteList = listName !== 'favoritas'
          const meta = byName[listName]
          const coverUrl = meta?.coverUrl || listMovies?.[0]?.posterUrl || ''
          return (
            <article key={listName} className="subpanel list-card">
              <button
                type="button"
                className="link-button"
                onClick={() => onOpenList(listName, listMovies, meta?.id || null, meta ? meta.allowVeto !== false : false)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <div className="list-card-cover-wrap">
                  {coverUrl ? (
                    <img src={coverUrl} alt={t('listCoverAlt', { listName })} className="list-card-cover" />
                  ) : (
                    <div className="list-card-cover placeholder">{t('noCover')}</div>
                  )}
                </div>
                <div className="list-header">
                  <h3>{listName}</h3>
                  {canDeleteList ? (
                    <span />
                  ) : null}
                </div>
                <p className='muted'> {t('moviesInList', { count: listMovies.length })}</p>
                {meta ? (
                  <p className="muted small">
                    {getVisibilityLabel(meta.visibility || (meta.isPublic ? 'public' : 'personal'))} • {meta.allowVeto ? t('listVetoEnabled') : t('listVetoDisabled')}
                  </p>
                ) : null}
              </button>
              <div className="list-card-actions">
                {meta?.isOwner ? (
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => startEditing(meta)}
                  >
                    {t('listSettingsButton')}
                  </button>
                ) : null}

                {canDeleteList ? (
                  <button
                    className="delete-list-btn"
                    onClick={(e) => { e.stopPropagation(); onDeleteList(listName) }}
                    title={t('deleteList', { listName })}
                    type="button"
                  >
                    {t('deleteAction')}
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {editingListId ? (
        <div className="list-settings-backdrop">
          <section className="list-settings-modal">
            <h3>{t('listSettingsTitle')}</h3>
            <div className="form-row">
              <input
                type="text"
                placeholder={t('listDescriptionPlaceholder')}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="form-row">
              <input
                type="url"
                placeholder={t('listCoverPlaceholder')}
                value={editCoverUrl}
                onChange={(e) => setEditCoverUrl(e.target.value)}
              />
            </div>
            <div className="form-row form-row-stack">
              <label className="small muted">{t('listVisibilityLabel')}</label>
              <select value={editVisibility} onChange={(e) => setEditVisibility(e.target.value)}>
                <option value="personal">{t('listVisibilityPersonal')}</option>
                <option value="private">{t('listVisibilityPrivate')}</option>
                <option value="public">{t('listVisibilityPublic')}</option>
              </select>
            </div>
            <div className="form-row form-row-stack">
              <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={editAllowVeto}
                  onChange={(e) => setEditAllowVeto(e.target.checked)}
                />
                {t('listVetoEnabled')}
              </label>
              {editVisibility === 'public' ? null : (
                <>
                  <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={editAllowMemberAdd}
                      onChange={(e) => setEditAllowMemberAdd(e.target.checked)}
                    />
                    {t('listMemberCanAdd')}
                  </label>
                  <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={editAllowMemberVeto}
                      onChange={(e) => setEditAllowMemberVeto(e.target.checked)}
                    />
                    {t('listMemberCanVeto')}
                  </label>
                </>
              )}
            </div>
            {editVisibility === 'private' ? (
              <div className="form-row form-row-stack">
                <label className="small muted">{t('privateInviteCodeLabel')}</label>
                <input
                  type="text"
                  value={privateInviteLink}
                  readOnly
                />
              </div>
            ) : null}
            <div className="form-row">
              <button type="button" onClick={saveSettings}>{t('saveSettings')}</button>
              <button type="button" className="ghost" onClick={cancelEditing}>{t('cancel')}</button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="create-list-actions">
        <button
          type="button"
          className="create-list-toggle"
          onClick={() => setShowCreateListPanel((prev) => !prev)}
        >
          {showCreateListPanel ? t('cancel') : t('createList')}
        </button>
      </div>

      <section className="subpanel create-list-form-panel" style={{ marginTop: 16 }}>
        <h3>{t('subscribePrivateListTitle')}</h3>
        <form className="create-list-panel" onSubmit={handleInviteSubscribe}>
          <div className="form-row">
            <input
              type="text"
              placeholder={t('privateInviteCodePlaceholder')}
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
            />
            <button type="submit" disabled={!inviteCodeInput.trim()}>
              {t('subscribeToList')}
            </button>
          </div>
        </form>
      </section>

      {showCreateListPanel ? (
        <section className="subpanel create-list-form-panel">
          <h3>{t('createNewList')}</h3>
          <form onSubmit={handleCreateList} className="create-list-panel">
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
            <div className="form-row form-row-stack">
              <label className="small muted">{t('listVisibilityLabel')}</label>
              <select value={newVisibility} onChange={(e) => setNewVisibility(e.target.value)}>
                <option value="personal">{t('listVisibilityPersonal')}</option>
                <option value="private">{t('listVisibilityPrivate')}</option>
                <option value="public">{t('listVisibilityPublic')}</option>
              </select>
            </div>
            <div className="form-row form-row-stack">
              <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={allowVeto}
                  onChange={(e) => setAllowVeto(e.target.checked)}
                />
                {t('listVetoEnabled')}
              </label>
              {newVisibility === 'public' ? null : (
                <>
                  <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={allowMemberAdd}
                      onChange={(e) => setAllowMemberAdd(e.target.checked)}
                    />
                    {t('listMemberCanAdd')}
                  </label>
                  <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={allowMemberVeto}
                      onChange={(e) => setAllowMemberVeto(e.target.checked)}
                    />
                    {t('listMemberCanVeto')}
                  </label>
                </>
              )}
            </div>
            <div className="form-row">
              <input
                type="text"
                placeholder={t('listDescriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="form-row">
              <input
                type="url"
                placeholder={t('listCoverPlaceholder')}
                value={createCoverUrl}
                onChange={(e) => setCreateCoverUrl(e.target.value)}
              />
            </div>
          </form>
        </section>
      ) : (
        <p className="muted small">{t('createListHint')}</p>
      )}
    </section>
  )
}

UserListsScreen.propTypes = {
  localLists: PropTypes.object.isRequired,
  serverLists: PropTypes.arrayOf(PropTypes.object),
  isLoading: PropTypes.bool,
  onOpenWatchedList: PropTypes.func,
  watchedMoviesCount: PropTypes.number,
  onUpdateListSettings: PropTypes.func,
  onCreateList: PropTypes.func.isRequired,
  onDeleteList: PropTypes.func.isRequired,
  onOpenList: PropTypes.func.isRequired,
  onSubscribeByInvite: PropTypes.func,
  t: PropTypes.func.isRequired,
}

UserListsScreen.defaultProps = {
  serverLists: [],
  isLoading: false,
  onOpenWatchedList: () => {},
  watchedMoviesCount: 0,
  onUpdateListSettings: async () => false,
  onSubscribeByInvite: async () => false,
}
