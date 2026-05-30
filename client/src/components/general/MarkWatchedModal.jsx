import { useState } from 'react'
import PropTypes from 'prop-types'
import ModalContainer from './ModalContainer'
import CloseModalButton from './CloseModalButton'

export default function MarkWatchedModal({ movie, onClose, onSave, t }) {
  const [rating, setRating] = useState(Number(movie?.myRating) || 3)
  const [saving, setSaving] = useState(false)

  if (!movie) return null

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const ok = await onSave(movie.id, rating)
    setSaving(false)
    if (ok) {
      onClose()
    }
  }

  return (
    <ModalContainer onClose={onClose} t={t} className="modal">
      <div className="panel-head">
        <h3>{t('markWatchedTitle', { title: movie.title })}</h3>
        <CloseModalButton onClose={onClose} t={t} />
      </div>

      <p className="muted small">{t('markWatchedSubtitle')}</p>

      <div className="rating-stars" role="radiogroup" aria-label={t('detailRating')}>
        {[1, 2, 3, 4, 5].map((starValue) => {
          const isFilled = Number(rating) >= starValue
          return (
            <button
              key={`${movie.id}-watch-star-${starValue}`}
              type="button"
              className={`star-btn ${isFilled ? 'filled' : ''}`}
              aria-label={`${t('detailRating')}: ${starValue}/5`}
              aria-checked={isFilled}
              role="radio"
              onClick={() => setRating(starValue)}
            >
              ★
            </button>
          )
        })}
      </div>

      <div className="inline" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="ghost" onClick={onClose} disabled={saving}>
          {t('cancel')}
        </button>
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? t('savingRating') : t('markWatchedSave')}
        </button>
      </div>
    </ModalContainer>
  )
}

MarkWatchedModal.propTypes = {
  movie: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string.isRequired,
    myRating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

MarkWatchedModal.defaultProps = {
  movie: null,
}
