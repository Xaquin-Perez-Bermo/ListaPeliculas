const ListSelector = ({ likeTargetMovie, localLists, getListsForMovie, isInSharedList, onToggleInLocalList, onCreateList, onDeleteList, onAddToSharedList, t }) => {
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
}

export default ListSelector
