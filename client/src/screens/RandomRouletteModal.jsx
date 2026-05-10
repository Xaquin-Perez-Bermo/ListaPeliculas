/**
 * RandomRouletteModal - Animated roulette for eligible movies
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import ModalContainer from '../components/general/ModalContainer'
import CloseModalButton from '../components/general/CloseModalButton'

const CANVAS_SIZE = 320
const RADIUS = 150

function drawRoulette(ctx, options, angle) {
  if (!ctx || !options.length) return

  const step = (2 * Math.PI) / options.length
  const center = CANVAS_SIZE / 2

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  options.forEach((movie, index) => {
    const start = angle + index * step
    const end = angle + (index + 1) * step

    ctx.beginPath()
    ctx.moveTo(center, center)
    ctx.fillStyle = `hsl(${(index * 360) / options.length}, 70%, 60%)`
    ctx.arc(center, center, RADIUS, start, end)
    ctx.fill()

    ctx.save()
    ctx.translate(center, center)
    ctx.rotate(angle + (index + 0.5) * step)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#1b1b1b'
    ctx.font = '13px Arial'
    const text = movie.title.length > 18 ? `${movie.title.slice(0, 17)}...` : movie.title
    ctx.fillText(text, RADIUS - 12, 5)
    ctx.restore()
  })
}

function getSelectedMovie(options, angle) {
  const tau = 2 * Math.PI
  const step = tau / options.length
  const pointerAngle = -Math.PI / 2
  const adjusted = ((pointerAngle - angle) % tau + tau) % tau
  const index = Math.floor(adjusted / step) % options.length
  return options[index]
}

export function RandomRouletteModal({ movies, onClose, onOpenDetail, t }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const [angle, setAngle] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [pickedMovie, setPickedMovie] = useState(null)

  const eligibleMovies = useMemo(
    () => movies.filter((movie) => !movie.isVetoed),
    [movies],
  )

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawRoulette(ctx, eligibleMovies, angle)
  }, [eligibleMovies, angle])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const spin = () => {
    if (spinning || !eligibleMovies.length) return

    setSpinning(true)
    setPickedMovie(null)

    let currentAngle = angle
    let velocity = Math.random() * 0.3 + 0.45

    const animate = () => {
      velocity *= 0.985
      currentAngle += velocity
      setAngle(currentAngle)

      if (velocity > 0.002) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        const result = getSelectedMovie(eligibleMovies, currentAngle)
        setPickedMovie(result)
        setSpinning(false)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
  }

  return (
    <ModalContainer onClose={onClose} t={t} className="modal roulette">
      <div className="panel-head">
        <h3>{t('rouletteTitle')}</h3>
        <CloseModalButton onClose={onClose} t={t} />
      </div>

      {eligibleMovies.length === 0 ? (
        <p className="error">{t('rouletteNoEligible')}</p>
      ) : (
        <>
          <div className="roulette-pointer">▼</div>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="roulette-canvas"
          />
          <div className="roulette-actions">
            <button type="button" onClick={spin} disabled={spinning}>
              {spinning ? t('rouletteSpinning') : t('rouletteSpinButton')}
            </button>
            {pickedMovie ? (
              <button
                type="button"
                className="ghost"
                onClick={() => onOpenDetail(pickedMovie.id)}
              >
                {t('rouletteViewDetail', { title: pickedMovie.title })}
              </button>
            ) : null}
          </div>
          {pickedMovie ? (
            <p className="success roulette-result">
              {t('rouletteResult', {
                title: pickedMovie.title,
                year: pickedMovie.year || t('naLabel'),
              })}
            </p>
          ) : null}
        </>
      )}
    </ModalContainer>
  )
}
