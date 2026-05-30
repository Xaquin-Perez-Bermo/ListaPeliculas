/**
 * SearchScreen - Pantalla de busqueda
 */
import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import SearchMovieCard from '../../components/search/SearchMovieCard'
import ModalMovieInfo from './ModalMovieInfo'
import ListSelector from '../lists/ListSelector'
import ModalContainer from '../../components/general/ModalContainer'
import { SearchScreenProvider } from './SearchScreenContext'

const PAGE_SIZE = 8

function SearchModeSwitcher({ searchMode, setSearchMode, t }) {
	return (
		<div className="search-mode-bar">
			<button
				type="button"
				className={searchMode === 'movies' ? 'tab-sm active' : 'tab-sm'}
				onClick={() => setSearchMode('movies')}
			>
				{t('searchModeMovies')}
			</button>
			<button
				type="button"
				className={searchMode === 'lists' ? 'tab-sm active' : 'tab-sm'}
				onClick={() => setSearchMode('lists')}
			>
				{t('searchModeLists')}
			</button>
		</div>
	)
}

function PublicListsResults({ filteredPublicLists, onSubscribeToList, t }) {
	return (
		<section className="public-list-results">
			<h3>{t('publicListsTitle')}</h3>
			{filteredPublicLists.length === 0 ? (
				<p className="muted">{t('publicListsEmpty')}</p>
			) : (
				<div className="grid-2" style={{ marginTop: 12 }}>
					{filteredPublicLists.map((list) => (
						<article key={list.id} className="subpanel public-list-card">
							{list.coverUrl ? (
								<img src={list.coverUrl} alt={t('listCoverAlt', { listName: list.name })} className="public-list-cover" />
							) : null}
							<h4>{list.name}</h4>
							<p className="muted small">{list.description || t('naLabel')}</p>
							<p className="muted small">
								{list.ownerUsername ? `${t('addedByLabel')} ${list.ownerUsername}` : ''}
							</p>
							<p className="muted small">
								{list.allowVeto ? t('listVetoEnabled') : t('listVetoDisabled')}
							</p>
							<button
								type="button"
								onClick={() => onSubscribeToList(list)}
								disabled={Boolean(list.isMember)}
							>
								{list.isMember ? t('alreadySubscribed') : t('subscribeToList')}
							</button>
						</article>
					))}
				</div>
			)}
		</section>
	)
}

function MovieResultsPanel({
	discoverResults,
	pendingCount,
	t,
	readyResults,
	setLikeTargetMovie,
	fetchStreamingInfo,
	setShowModalMovieInfo,
	streamingInfoDataById,
	showModalMovieInfo,
	selectedSearchMovie,
	hasMore,
	setVisibleCount,
	isVisibleBatchReady,
	committedVisibleCount,
	likeTargetMovie,
	localLists,
	getListsForMovie,
	isInSharedList,
	onToggleInLocalList,
	onCreateList,
	onAddToList,
}) {
	if (discoverResults.length === 0) return null

	return (
		<>
			{pendingCount > 0 ? (
				<p className="muted">{t('streamingInfoLoading')} ({pendingCount})</p>
			) : null}

			<div className="search-layout">
				<ul className="result-list search-results-col">
					{readyResults.map((movie) => {
						const streamingKey = movie.externalId || `${movie.title}-${movie.year}`
						return (
							<SearchMovieCard
								key={movie.externalId || movie.id || movie.title}
								movie={movie}
								setLikeTargetMovie={setLikeTargetMovie}
								onSelectMovie={(targetMovie) => {
									fetchStreamingInfo(targetMovie)
									setShowModalMovieInfo(true)
								}}
								streamingInfoData={streamingInfoDataById?.[streamingKey]}
							/>
						)
					})}
				</ul>

				{showModalMovieInfo && selectedSearchMovie ? (
					<ModalContainer
						onClose={() => setShowModalMovieInfo(false)}
						t={t}
						className="modal movie-info-modal"
					>
						<ModalMovieInfo onClose={() => setShowModalMovieInfo(false)} />
					</ModalContainer>
				) : null}
			</div>

			{hasMore ? (
				<div className="search-load-more">
					<button
						type="button"
						className="ghost"
						onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
						disabled={!isVisibleBatchReady}
					>
						{t('searchLoadMore', {
							shown: committedVisibleCount,
							total: discoverResults.length,
						})}
					</button>
				</div>
			) : null}

			{likeTargetMovie ? (
				<ModalContainer onClose={() => setLikeTargetMovie(null)} t={t}>
					<ListSelector
						localLists={localLists}
						selectedListNames={getListsForMovie(likeTargetMovie.externalId)}
						isInSharedList={isInSharedList(likeTargetMovie.externalId)}
						onToggleInList={(listName) => {
							onToggleInLocalList(listName, likeTargetMovie)
						}}
						onCreateList={onCreateList}
						onAddToList={() => {
							onAddToList(likeTargetMovie)
						}}
						t={t}
					/>
				</ModalContainer>
			) : null}
		</>
	)
}

SearchModeSwitcher.propTypes = {
	searchMode: PropTypes.string.isRequired,
	setSearchMode: PropTypes.func.isRequired,
	t: PropTypes.func.isRequired,
}

PublicListsResults.propTypes = {
	filteredPublicLists: PropTypes.arrayOf(PropTypes.object).isRequired,
	onSubscribeToList: PropTypes.func.isRequired,
	t: PropTypes.func.isRequired,
}

MovieResultsPanel.propTypes = {
	discoverResults: PropTypes.arrayOf(PropTypes.object).isRequired,
	pendingCount: PropTypes.number.isRequired,
	t: PropTypes.func.isRequired,
	readyResults: PropTypes.arrayOf(PropTypes.object).isRequired,
	setLikeTargetMovie: PropTypes.func.isRequired,
	fetchStreamingInfo: PropTypes.func.isRequired,
	setShowModalMovieInfo: PropTypes.func.isRequired,
	streamingInfoDataById: PropTypes.object.isRequired,
	showModalMovieInfo: PropTypes.bool.isRequired,
	selectedSearchMovie: PropTypes.object,
	hasMore: PropTypes.bool.isRequired,
	setVisibleCount: PropTypes.func.isRequired,
	isVisibleBatchReady: PropTypes.bool.isRequired,
	committedVisibleCount: PropTypes.number.isRequired,
	likeTargetMovie: PropTypes.object,
	localLists: PropTypes.object.isRequired,
	getListsForMovie: PropTypes.func.isRequired,
	isInSharedList: PropTypes.func.isRequired,
	onToggleInLocalList: PropTypes.func.isRequired,
	onCreateList: PropTypes.func.isRequired,
	onAddToList: PropTypes.func.isRequired,
}

MovieResultsPanel.defaultProps = {
	selectedSearchMovie: null,
	likeTargetMovie: null,
}

export function SearchScreen({ search, lists, listActions, listDiscovery, i18n }) {
	const { t, tGenre } = i18n
	const {
		discoverQuery,
		setDiscoverQuery,
		discoverResults,
		discoverError,
		handleDiscover,
		selectedSearchMovie,
		streamingInfoData,
		streamingInfoDataById = {},
		streamingInfoLoading,
		streamingInfoLoadingById = {},
		streamingInfoError,
		fetchStreamingInfo,
		fetchStreamingInfoForMovie,
		isSearching,
	} = search
	const {
		localLists,
		getListsForMovie,
		isMovieSaved,
		isInSharedList,
	} = lists
	const {
		onToggleInLocalList,
		onCreateList,
		onAddToList,
	} = listActions
	const {
		publicLists = [],
		publicListQuery = '',
		onPublicSearchChange = () => {},
		onSubscribeToList = () => {},
		currentUsername = '',
	} = listDiscovery || {}

	const [likeTargetMovie, setLikeTargetMovie] = useState(null)
	const [showModalMovieInfo, setShowModalMovieInfo] = useState(false)
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
	const [committedVisibleCount, setCommittedVisibleCount] = useState(0)
	const [searchMode, setSearchMode] = useState('movies')

	const filteredPublicLists = useMemo(
		() =>
			(publicLists || []).filter(
				(list) => !list.isOwner && list.ownerUsername !== currentUsername,
			),
		[publicLists, currentUsername],
	)

	const visibleResults = useMemo(
		() => discoverResults.slice(0, visibleCount),
		[discoverResults, visibleCount],
	)

	const committedResults = useMemo(
		() => discoverResults.slice(0, committedVisibleCount),
		[discoverResults, committedVisibleCount],
	)

	const readyResults = useMemo(
		() =>
			committedResults.filter((movie) => {
				const streamingKey = movie.externalId || `${movie.title}-${movie.year}`
				return Boolean(streamingInfoDataById?.[streamingKey])
			}),
		[committedResults, streamingInfoDataById],
	)

	const resolvedVisibleCount = useMemo(
		() =>
			visibleResults.filter((movie) => {
				const streamingKey = movie.externalId || `${movie.title}-${movie.year}`
				return streamingInfoDataById?.[streamingKey] !== undefined && !streamingInfoLoadingById?.[streamingKey]
			}).length,
		[visibleResults, streamingInfoDataById, streamingInfoLoadingById],
	)

	const pendingCount = Math.max(0, visibleResults.length - resolvedVisibleCount)
	const isVisibleBatchReady = visibleResults.length > 0 && resolvedVisibleCount >= visibleResults.length
	const hasMore = visibleCount < discoverResults.length

	useEffect(() => {
		if (isVisibleBatchReady && committedVisibleCount < visibleCount) {
			setCommittedVisibleCount(visibleCount)
		}
	}, [isVisibleBatchReady, committedVisibleCount, visibleCount])

	useEffect(() => {
		let cancelled = false

		const warmVisibleResults = async () => {
			for (const movie of visibleResults) {
				if (cancelled) {
					return
				}
				await fetchStreamingInfoForMovie(movie)
			}
		}

		if (visibleResults.length > 0) {
			warmVisibleResults()
		}

		return () => {
			cancelled = true
		}
	}, [visibleResults, fetchStreamingInfoForMovie])

	const handleSearch = (event) => {
		setVisibleCount(PAGE_SIZE)
		setCommittedVisibleCount(0)
		handleDiscover(event)
	}

	const contextValue = useMemo(
		() => ({
			discoverQuery,
			setDiscoverQuery,
			discoverResults,
			discoverError,
			handleDiscover,
			selectedSearchMovie,
			streamingInfoData,
			streamingInfoDataById,
			streamingInfoLoading,
			streamingInfoLoadingById,
			streamingInfoError,
			fetchStreamingInfo,
			fetchStreamingInfoForMovie,
			isSearching,
			localLists,
			onToggleInLocalList,
			getListsForMovie,
			isMovieSaved,
			isInSharedList,
			onCreateList,
			onAddToList,
			t,
			tGenre,
		}),
		[
			discoverQuery,
			setDiscoverQuery,
			discoverResults,
			discoverError,
			handleDiscover,
			selectedSearchMovie,
			streamingInfoData,
			streamingInfoDataById,
			streamingInfoLoading,
			streamingInfoLoadingById,
			streamingInfoError,
			fetchStreamingInfo,
			fetchStreamingInfoForMovie,
			isSearching,
			localLists,
			onToggleInLocalList,
			getListsForMovie,
			isMovieSaved,
			isInSharedList,
			onCreateList,
			onAddToList,
			t,
			tGenre,
		],
	)

	return (
		<SearchScreenProvider value={contextValue}>
			<section className="panel">
				<h2>{t('searchTitle')}</h2>

				<SearchModeSwitcher searchMode={searchMode} setSearchMode={setSearchMode} t={t} />

				{searchMode === 'movies' ? (
					<form onSubmit={handleSearch} className="inline-form">
						<input
							type="text"
							placeholder={t('searchPlaceholder')}
							value={discoverQuery}
							onChange={(event) => setDiscoverQuery(event.target.value)}
							required
						/>
						<button type="submit" disabled={isSearching}>
							{isSearching ? t('searchingButton') : t('searchButton')}
						</button>
					</form>
				) : (
					<div className="inline-form">
						<input
							type="text"
							placeholder={t('publicListSearchPlaceholder')}
							value={publicListQuery}
							onChange={(event) => onPublicSearchChange(event.target.value)}
						/>
					</div>
				)}

				{searchMode === 'movies' && discoverError ? <p className="error">{discoverError}</p> : null}
				{searchMode === 'movies' && isSearching ? <p className="muted">{t('searchingButton')}</p> : null}

				{searchMode === 'movies' ? (
					<MovieResultsPanel
						discoverResults={discoverResults}
						pendingCount={pendingCount}
						t={t}
						readyResults={readyResults}
						setLikeTargetMovie={setLikeTargetMovie}
						fetchStreamingInfo={fetchStreamingInfo}
						setShowModalMovieInfo={setShowModalMovieInfo}
						streamingInfoDataById={streamingInfoDataById}
						showModalMovieInfo={showModalMovieInfo}
						selectedSearchMovie={selectedSearchMovie}
						hasMore={hasMore}
						setVisibleCount={setVisibleCount}
						isVisibleBatchReady={isVisibleBatchReady}
						committedVisibleCount={committedVisibleCount}
						likeTargetMovie={likeTargetMovie}
						localLists={localLists}
						getListsForMovie={getListsForMovie}
						isInSharedList={isInSharedList}
						onToggleInLocalList={onToggleInLocalList}
						onCreateList={onCreateList}
						onAddToList={onAddToList}
					/>
				) : (
					<PublicListsResults
						filteredPublicLists={filteredPublicLists}
						onSubscribeToList={onSubscribeToList}
						t={t}
					/>
				)}
			</section>
		</SearchScreenProvider>
	)
}

SearchScreen.propTypes = {
	search: PropTypes.object.isRequired,
	lists: PropTypes.object.isRequired,
	listActions: PropTypes.shape({
		onToggleInLocalList: PropTypes.func.isRequired,
		onCreateList: PropTypes.func.isRequired,
		onAddToList: PropTypes.func.isRequired,
	}).isRequired,
	listDiscovery: PropTypes.shape({
		publicLists: PropTypes.arrayOf(PropTypes.object),
		publicListQuery: PropTypes.string,
		onPublicSearchChange: PropTypes.func,
		onSubscribeToList: PropTypes.func,
		currentUsername: PropTypes.string,
	}),
	i18n: PropTypes.shape({
		t: PropTypes.func.isRequired,
		tGenre: PropTypes.func.isRequired,
	}).isRequired,
}

SearchScreen.defaultProps = {
	listDiscovery: {
		publicLists: [],
		publicListQuery: '',
		onPublicSearchChange: () => {},
		onSubscribeToList: () => {},
		currentUsername: '',
	},
}
