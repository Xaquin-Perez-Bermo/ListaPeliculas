import { useMemo } from 'react'
import PropTypes from 'prop-types'

const CHART_COLORS = ['#0b84f3', '#f97316', '#10b981', '#ef4444', '#a855f7']

function monthKey(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null
  return dateString.slice(0, 7)
}

function formatMonthLabel(key) {
  if (!key) return ''
  const [year, month] = key.split('-')
  return `${month}/${year.slice(2)}`
}

function buildTimeline(watchedMovies, topGenres) {
  const monthlyPoints = {}

  for (const movie of watchedMovies) {
    const key = monthKey(movie.myWatchedOn)
    if (!key) continue

    if (!monthlyPoints[key]) {
      monthlyPoints[key] = {}
    }

    for (const genre of movie.genres || []) {
      const normalized = String(genre || '').trim()
      if (!normalized || !topGenres.includes(normalized)) continue
      monthlyPoints[key][normalized] = (monthlyPoints[key][normalized] || 0) + 1
    }
  }

  const months = Object.keys(monthlyPoints).sort((a, b) => a.localeCompare(b))
  const cumulative = {}
  for (const genre of topGenres) {
    cumulative[genre] = 0
  }

  return months.map((month) => {
    const row = { month }
    for (const genre of topGenres) {
      cumulative[genre] += monthlyPoints[month][genre] || 0
      row[genre] = cumulative[genre]
    }
    return row
  })
}

export function WatchedGenresTimelineChart({ watchedMovies, t, tGenre }) {
  const model = useMemo(() => {
    const genreCount = new Map()
    for (const movie of watchedMovies) {
      for (const genre of movie.genres || []) {
        const normalized = String(genre || '').trim()
        if (!normalized) continue
        genreCount.set(normalized, (genreCount.get(normalized) || 0) + 1)
      }
    }

    const topGenres = [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre)

    const timeline = buildTimeline(watchedMovies, topGenres)
    const maxValue = Math.max(
      1,
      ...timeline.flatMap((point) => topGenres.map((genre) => point[genre] || 0)),
    )

    return {
      topGenres,
      timeline,
      maxValue,
    }
  }, [watchedMovies])

  if (!model.topGenres.length || !model.timeline.length) {
    return <p className="muted small">{t('watchedChartEmpty')}</p>
  }

  const width = 780
  const height = 260
  const padding = { top: 16, right: 16, bottom: 42, left: 42 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const steps = Math.max(model.timeline.length - 1, 1)

  const getX = (index) => padding.left + (index / steps) * innerWidth
  const getY = (value) => padding.top + innerHeight - (value / model.maxValue) * innerHeight

  const yTicks = 4
  const yValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((model.maxValue / yTicks) * i),
  )

  return (
    <div className="watched-chart">
      <h3>{t('watchedChartTitle')}</h3>
      <p className="muted small">{t('watchedChartSubtitle')}</p>

      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('watchedChartTitle')}>
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={padding.left + innerWidth}
          y2={padding.top + innerHeight}
          stroke="rgba(255,255,255,0.3)"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + innerHeight}
          stroke="rgba(255,255,255,0.3)"
        />

        {yValues.map((tick) => {
          const y = getY(tick)
          return (
            <g key={`tick-${tick}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerWidth}
                y2={y}
                stroke="rgba(255,255,255,0.12)"
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="chart-axis-label">
                {tick}
              </text>
            </g>
          )
        })}

        {model.timeline.map((point, index) => (
          <text
            key={`month-${point.month}`}
            x={getX(index)}
            y={height - 14}
            textAnchor="middle"
            className="chart-axis-label"
          >
            {formatMonthLabel(point.month)}
          </text>
        ))}

        {model.topGenres.map((genre, genreIndex) => {
          const color = CHART_COLORS[genreIndex % CHART_COLORS.length]
          const pathData = model.timeline
            .map((point, index) => {
              const x = getX(index)
              const y = getY(point[genre] || 0)
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
            })
            .join(' ')

          return (
            <path
              key={genre}
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      <div className="watched-chart-legend">
        {model.topGenres.map((genre, genreIndex) => (
          <div key={`legend-${genre}`} className="watched-chart-legend-item">
            <span
              className="watched-chart-legend-swatch"
              style={{ backgroundColor: CHART_COLORS[genreIndex % CHART_COLORS.length] }}
            />
            <span>{tGenre(genre)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

WatchedGenresTimelineChart.propTypes = {
  watchedMovies: PropTypes.arrayOf(PropTypes.object).isRequired,
  t: PropTypes.func.isRequired,
  tGenre: PropTypes.func.isRequired,
}
