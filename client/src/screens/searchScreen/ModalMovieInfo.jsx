/**
 * ModalMovieInfo - Modal con info de disponibilidad en streaming de la película
 */
import { useState } from 'react'
import PropTypes from 'prop-types'
import ListSelector from '../lists/ListSelector'
import CloseModalButton from '../../components/general/CloseModalButton'
import { useSearchScreenContext } from './SearchScreenContext'

function renderMovieMeta(streamingInfoData, t) {
	return (
		<div className="movie-info-meta">
			{streamingInfoData.runtime_minutes ? (
				<span>{t('durationLabel')}: {streamingInfoData.runtime_minutes} min</span>
			) : null}
			{streamingInfoData.us_rating ? (
				<span className="chip">{streamingInfoData.us_rating}</span>
			) : null}
			{streamingInfoData.user_rating ? (
				<span>{t('userRatingLabel')}: {streamingInfoData.user_rating}/10</span>
			) : null}
			{streamingInfoData.critic_score ? (
				<span>{t('criticScore')}: {streamingInfoData.critic_score}/100</span>
			) : null}
		</div>
	)
}

function renderSources(streamingInfoData, t) {
	if (!streamingInfoData.sources?.length) {
		return <p className="muted">{t('notStreaming')}</p>
	}

	const uniqueSources = [...new Map(streamingInfoData.sources.map((source) => [source.name, source])).values()]

	return (
		<>
			<h4>{t('availableOn')}</h4>
			<div className="source-chips">
				{uniqueSources.map((source) => {
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
				})}
			</div>
		</>
	)
}

function renderModalBody({
	streamingInfoLoading,
	streamingInfoError,
	streamingInfoData,
	selectedSearchMovie,
	t,
	tGenre,
	isSavedAnywhere,
	setShowListSelector,
	showListSelector,
	localLists,
	savedLocalLists,
	isInSharedList,
	onToggleInLocalList,
	onCreateList,
	onAddToList,
	shouldShowEmptyState,
}) {
	return (
		<>
			{streamingInfoLoading ? (
				<div style={{ textAlign: 'center', padding: '20px' }}>
					<p className="muted">{t('streamingInfoLoading')}</p>
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

					{renderMovieMeta(streamingInfoData, t)}

					{streamingInfoData.plot_overview ? (
						<p className="movie-info-plot">{streamingInfoData.plot_overview}</p>
					) : null}

					{renderSources(streamingInfoData, t)}

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
							onAddToList={() => {
								onAddToList(selectedSearchMovie)
							}}
							t={t}
						/>
					) : null}
				</>
			) : null}

			{shouldShowEmptyState ? (
				<p className="muted">{t('clickMovieToLoad')}</p>
			) : null}
		</>
	)
}

function ModalMovieInfo({
	onClose,
}) {
	const {
		selectedSearchMovie,
		streamingInfoData,
		streamingInfoLoading,
		streamingInfoError,
		localLists,
		onToggleInLocalList,
		getListsForMovie,
		isMovieSaved,
		isInSharedList,
		onCreateList,
		onAddToList,
		t,
		tGenre,
	} = useSearchScreenContext()

	const [showListSelector, setShowListSelector] = useState(false)
	const savedLocalLists = getListsForMovie(selectedSearchMovie?.externalId)
	const isSavedLocally = isMovieSaved(selectedSearchMovie?.externalId)
	const isSavedAnywhere =
		isSavedLocally || isInSharedList(selectedSearchMovie?.externalId)
	const shouldShowEmptyState = !streamingInfoLoading && !streamingInfoData && !streamingInfoError

	if (!selectedSearchMovie) {
		return null
	}

	return (
		<>
			<div className="panel-head">
				<h3>
					{selectedSearchMovie.title}{' '}
					{selectedSearchMovie.year ? `(${selectedSearchMovie.year})` : ''}
				</h3>
				<CloseModalButton onClose={onClose} t={t} />
			</div>

			{renderModalBody({
				streamingInfoLoading,
				streamingInfoError,
				streamingInfoData,
				selectedSearchMovie,
				t,
				tGenre,
				isSavedAnywhere,
				setShowListSelector,
				showListSelector,
				localLists,
				savedLocalLists,
				isInSharedList,
				onToggleInLocalList,
				onCreateList,
				onAddToList,
				shouldShowEmptyState,
			})}
		</>
	)
}

ModalMovieInfo.propTypes = {
	onClose: PropTypes.func.isRequired,
}

export default ModalMovieInfo
