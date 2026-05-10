/**
 * SearchScreen - Pantalla de búsqueda
 */
import SearchMovieCard from '../../components/search/SearchMovieCard';
import ModalMovieInfo from './ModalMovieInfo'
import ListSelector from '../lists/ListSelector'
import { useState } from 'react'
import ModalContainer from '../../components/general/ModalContainer';

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
	const [showModalMovieInfo, setShowModalMovieInfo] = useState(false)
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
											setShowModalMovieInfo(true)
										}}
										selectedSearchMovie={selectedSearchMovie}
										watchmodeData={watchmodeDataById?.[watchmodeKey]}
										hasSavedAnywhere={hasSavedAnywhere}
									/>
								)
							})}
						</ul>

						{showModalMovieInfo && selectedSearchMovie ? (
							<ModalContainer onClose={() => setShowModalMovieInfo(false)} t={t}>
								<ModalMovieInfo
									selectedSearchMovie={selectedSearchMovie}
									watchmodeData={watchmodeData}
									watchmodeLoading={watchmodeLoading}
									watchmodeError={watchmodeError}
									onClose={() => setShowModalMovieInfo(false)}
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
							</ModalContainer>
						) : null}
					</div>

					{likeTargetMovie ? (
						<ModalContainer onClose={() => setLikeTargetMovie(null)} t={t}>
							<ListSelector
								likeTargetMovie={likeTargetMovie}
								localLists={localLists}
								getListsForMovie={getListsForMovie}
								isInSharedList={isInSharedList}
								onToggleInLocalList={onToggleInLocalList}
								onCreateList={onCreateList}
								onDeleteList={onDeleteList}
								onAddToSharedList={onAddToSharedList}
								t={t}
							/>
						</ModalContainer>
					) : null}
				</>
			) : null}
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

		</section>
	)
}

