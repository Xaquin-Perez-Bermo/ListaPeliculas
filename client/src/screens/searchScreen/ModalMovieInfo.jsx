/**
 * ModalMovieInfo - Modal con info de disponibilidad en streaming de la película
 */
import { useState } from 'react'
import ListSelector from '../lists/ListSelector'
import CloseModalButton from '../../components/general/CloseModalButton'

function ModalMovieInfo({
	selectedSearchMovie,
	streamingInfoData,
	streamingInfoLoading,
	streamingInfoError,
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
	tGenre,
}) {
	const [showListSelector, setShowListSelector] = useState(false)
	const savedLocalLists = getListsForMovie(selectedSearchMovie?.externalId)
	const isSavedLocally = isMovieSaved(selectedSearchMovie?.externalId)
	const isSavedAnywhere =
		isSavedLocally || isInSharedList(selectedSearchMovie?.externalId)
	return (
		<>
			<div className="panel-head">
				<h3>
					{selectedSearchMovie.title}{' '}
					{selectedSearchMovie.year ? `(${selectedSearchMovie.year})` : ''}
				</h3>
				<CloseModalButton onClose={onClose} t={t} />
			</div>

			{streamingInfoLoading ? (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<p className="muted">⏳ {t('streamingInfoLoading')}</p>
				</div>
			) : null}
			{streamingInfoError ? <p className="error">{streamingInfoError}</p> : null}

			{streamingInfoData ? (
				<>
					{streamingInfoData.poster ? (
						<img
							src={streamingInfoData.poster}
							alt={streamingInfoData.title}
							className="movie-info-poster"
						/>
					) : null}

					<div className="chip-row">
						{(streamingInfoData.genre_names || selectedSearchMovie.genres).map((genre) => (
							<span key={`info-${genre}`} className="chip">
								{tGenre(genre)}
							</span>
						))}
					</div>

					<div className="movie-info-meta">
						{streamingInfoData.runtime_minutes ? (
							<span>⏱️ {streamingInfoData.runtime_minutes} min</span>
						) : null}
						{streamingInfoData.us_rating ? (
							<span className="chip">{streamingInfoData.us_rating}</span>
						) : null}
						{streamingInfoData.user_rating ? (
							<span>⭐ {streamingInfoData.user_rating}/10</span>
						) : null}
						{streamingInfoData.critic_score ? (
							<span>🎯 {t('criticScore')}: {streamingInfoData.critic_score}/100</span>
						) : null}
					</div>

					{streamingInfoData.plot_overview ? (
						<p className="movie-info-plot">{streamingInfoData.plot_overview}</p>
					) : null}

					{streamingInfoData.sources?.length ? (
						<>
							<h4>{t('availableOn')}</h4>
							<div className="source-chips">
								{[...new Map(streamingInfoData.sources.map((s) => [s.name, s])).values()].map(
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

					<div className="movie-info-actions">
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

			{!streamingInfoLoading && !streamingInfoData && !streamingInfoError ? (
				<p className="muted">{t('clickMovieToLoad')}</p>
			) : null}
		</>
	)
}

export default ModalMovieInfo
