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

export function SearchScreen({ search, lists, listActions, i18n }) {
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
		onDeleteList,
		onAddToSharedList,
	} = listActions

	const [likeTargetMovie, setLikeTargetMovie] = useState(null)
	const [showModalMovieInfo, setShowModalMovieInfo] = useState(false)
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
	const [committedVisibleCount, setCommittedVisibleCount] = useState(0)

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
			onDeleteList,
			onAddToSharedList,
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
			onDeleteList,
			onAddToSharedList,
			t,
			tGenre,
		],
	)

	return (
		<SearchScreenProvider value={contextValue}>
			<section className="panel">
				<h2>{t('searchTitle')}</h2>

				<form onSubmit={handleSearch} className="inline-form">
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
						{pendingCount > 0 ? (
							<p className="muted">⏳ {t('streamingInfoLoading')} ({pendingCount})</p>
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
									onDeleteList={onDeleteList}
									onAddToSharedList={() => {
										onAddToSharedList(likeTargetMovie)
									}}
									t={t}
								/>
							</ModalContainer>
						) : null}
					</>
				) : null}
			</section>
		</SearchScreenProvider>
	)
}

SearchScreen.propTypes = {
	search: PropTypes.object.isRequired,
	lists: PropTypes.object.isRequired,
	listActions: PropTypes.object.isRequired,
	i18n: PropTypes.shape({
		t: PropTypes.func.isRequired,
		tGenre: PropTypes.func.isRequired,
	}).isRequired,
}
