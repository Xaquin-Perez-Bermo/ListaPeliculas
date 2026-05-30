import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import ModalContainer from '../components/general/ModalContainer'
import CloseModalButton from '../components/general/CloseModalButton'
import { moviesAPI } from '../services/api'

function renderSources(streamingInfoData, t) {
  if (!streamingInfoData?.sources?.length) {
    return <p className="muted">{t('notStreaming')}</p>
  }

  const uniqueSources = [...new Map(streamingInfoData.sources.map((source) => [source.name, source])).values()]

  return (
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
  )
}

/**
 * MovieDetailModal - Modal para mostrar detalles de película
 */
export function MovieDetailModal({
  selectedMovie,
  onClose,
  t,
  tGenre,
}) {
  const [streamingInfoData, setStreamingInfoData] = useState(null)
  const [streamingInfoLoading, setStreamingInfoLoading] = useState(false)
  const [streamingInfoError, setStreamingInfoError] = useState('')

  useEffect(() => {
    if (!selectedMovie?.title) return

    let isMounted = true

    const loadStreamingInfo = async () => {
      setStreamingInfoLoading(true)
      setStreamingInfoError('')

      try {
        const data = await moviesAPI.getStreamingInfo(selectedMovie.title, selectedMovie.year)
        if (!isMounted) return
        setStreamingInfoData(data)
      } catch (error) {
        if (!isMounted) return
        setStreamingInfoData(null)
        setStreamingInfoError(error.message || t('notStreaming'))
      } finally {
        if (isMounted) {
          setStreamingInfoLoading(false)
        }
      }
    }

    loadStreamingInfo()

    return () => {
      isMounted = false
    }
  }, [selectedMovie, t])

  const displayedGenres = useMemo(() => {
    if (selectedMovie?.genres?.length) return selectedMovie.genres
    return streamingInfoData?.genre_names || []
  }, [selectedMovie, streamingInfoData])

  const posterUrl = selectedMovie?.posterUrl || streamingInfoData?.poster || ''
  const synopsis = selectedMovie?.overview || streamingInfoData?.plot_overview || t('detailNoOverview')

  if (!selectedMovie) {
    return null
  }

  return (
    <ModalContainer onClose={onClose} t={t} className="modal large">
      <div>
        <div className="panel-head">
          <h3>
            {selectedMovie.title} {selectedMovie.year ? `(${selectedMovie.year})` : ''}
          </h3>
          <CloseModalButton onClose={onClose} t={t} />
        </div>

        <div className="chip-row">
          {displayedGenres.map((genre) => (
            <span key={`${selectedMovie.id}-detail-${genre}`} className="chip">
              {tGenre(genre)}
            </span>
          ))}
        </div>

        {posterUrl ? (
          <img
            src={posterUrl}
            alt={selectedMovie.title}
            className="movie-info-poster"
          />
        ) : null}

        <p className="movie-info-plot">{synopsis}</p>

        <h4>{t('availableOn')}</h4>
        {streamingInfoLoading ? <p className="muted">{t('streamingInfoLoading')}</p> : null}
        {streamingInfoError ? <p className="error">{streamingInfoError}</p> : null}
        {!streamingInfoLoading && !streamingInfoError ? renderSources(streamingInfoData, t) : null}

      </div>
    </ModalContainer>
  )
}

MovieDetailModal.propTypes = {
  selectedMovie: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    title: PropTypes.string,
    year: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    genres: PropTypes.arrayOf(PropTypes.string),
    posterUrl: PropTypes.string,
    overview: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  tGenre: PropTypes.func.isRequired,
}

MovieDetailModal.defaultProps = {
  selectedMovie: null,
}
