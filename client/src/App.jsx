import { useEffect, useMemo, useState } from 'react'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [movies, setMovies] = useState([])
  const [discoverQuery, setDiscoverQuery] = useState('')
  const [discoverResults, setDiscoverResults] = useState([])
  const [discoverError, setDiscoverError] = useState('')

  const [statusFilter, setStatusFilter] = useState('all')
  const [genreFilter, setGenreFilter] = useState('')
  const [genreVetoes, setGenreVetoes] = useState([])
  const [newGenreVeto, setNewGenreVeto] = useState('')

  const [randomPick, setRandomPick] = useState(null)
  const [randomError, setRandomError] = useState('')
  const [logs, setLogs] = useState([])

  const today = new Date().toISOString().slice(0, 10)
  const [ratingInputs, setRatingInputs] = useState({})

  async function api(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(path, {
      ...options,
      headers,
    })

    let body = {}

    try {
      body = await response.json()
    } catch {
      body = {}
    }

    if (!response.ok) {
      throw new Error(body.error || 'Error inesperado en la API')
    }

    return body
  }

  async function loadData() {
    if (!token) return

    const [me, moviesData, genreData, logsData] = await Promise.all([
      api('/api/auth/me'),
      api(`/api/movies?status=${statusFilter}&genre=${encodeURIComponent(genreFilter)}`),
      api('/api/veto-genres'),
      api('/api/logs'),
    ])

    setUser(me)
    setMovies(moviesData)
    setGenreVetoes(genreData)
    setLogs(logsData)
  }

  useEffect(() => {
    loadData().catch((error) => {
      setAuthError(error.message)
      setToken('')
      localStorage.removeItem('token')
    })
  }, [token, statusFilter, genreFilter])

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthError('')

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const data = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })

      setToken(data.token)
      localStorage.setItem('token', data.token)
      setUsername('')
      setPassword('')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  async function handleDiscover(event) {
    event.preventDefault()
    setDiscoverError('')

    try {
      const data = await api(`/api/discover?q=${encodeURIComponent(discoverQuery)}`)
      setDiscoverResults(data)
    } catch (error) {
      setDiscoverError(error.message)
      setDiscoverResults([])
    }
  }

  async function addMovie(movie) {
    await api('/api/movies', {
      method: 'POST',
      body: JSON.stringify(movie),
    })
    await loadData()
  }

  async function vetoMovie(movieId) {
    await api(`/api/movies/${movieId}/veto`, { method: 'POST' })
    await loadData()
  }

  async function unvetoMovie(movieId) {
    await api(`/api/movies/${movieId}/veto`, { method: 'DELETE' })
    await loadData()
  }

  async function addGenreVeto(event) {
    event.preventDefault()
    if (!newGenreVeto.trim()) return

    await api('/api/veto-genres', {
      method: 'POST',
      body: JSON.stringify({ genre: newGenreVeto.trim() }),
    })

    setNewGenreVeto('')
    await loadData()
  }

  async function removeGenreVeto(genre) {
    await api(`/api/veto-genres/${encodeURIComponent(genre)}`, { method: 'DELETE' })
    await loadData()
  }

  async function saveRating(movieId) {
    const current = ratingInputs[movieId] || { rating: 3, watchedOn: today }

    await api(`/api/movies/${movieId}/rating`, {
      method: 'POST',
      body: JSON.stringify(current),
    })

    await loadData()
  }

  async function pickRandomMovie() {
    setRandomError('')

    try {
      const data = await api('/api/random-pick')
      setRandomPick(data)
    } catch (error) {
      setRandomPick(null)
      setRandomError(error.message)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
    setMovies([])
    setGenreVetoes([])
    setLogs([])
  }

  const groupedGenreVetoes = useMemo(() => {
    return genreVetoes.reduce((acc, item) => {
      if (!acc[item.genre]) acc[item.genre] = []
      acc[item.genre].push(item.username)
      return acc
    }, {})
  }, [genreVetoes])

  return (
    <div className="page">
      <header className="topbar">
        <h1>CineJunta</h1>
        {user ? (
          <div className="topbar-user">
            <span>Hola, {user.username}</span>
            <button onClick={logout}>Salir</button>
          </div>
        ) : null}
      </header>

      {token ? (
        <main className="grid">
          <section className="panel">
            <h2>Buscar peliculas</h2>
            <form onSubmit={handleDiscover} className="inline-form">
              <input
                type="text"
                placeholder="Ej: Inception"
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                required
              />
              <button type="submit">Buscar</button>
            </form>

            {discoverError ? <p className="error">{discoverError}</p> : null}

            <ul className="result-list">
              {discoverResults.map((movie) => (
                <li key={movie.externalId} className="movie-item compact">
                  <div>
                    <strong>{movie.title}</strong>
                    <p>
                      {movie.year || 'N/A'} | {movie.genres.join(', ')}
                    </p>
                  </div>
                  <button onClick={() => addMovie(movie)}>Anadir a lista</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Vetos por genero</h2>
            <form onSubmit={addGenreVeto} className="inline-form">
              <input
                type="text"
                placeholder="Ej: Horror"
                value={newGenreVeto}
                onChange={(e) => setNewGenreVeto(e.target.value)}
              />
              <button type="submit">Vetar genero</button>
            </form>

            <ul className="pill-list">
              {Object.entries(groupedGenreVetoes).map(([genre, users]) => (
                <li key={genre}>
                  <span>
                    {genre} ({users.join(', ')})
                  </span>
                  <button className="ghost" onClick={() => removeGenreVeto(genre)}>
                    quitar mi veto
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel full-width">
            <div className="panel-head">
              <h2>Lista conjunta</h2>
              <div className="filters">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="active">Solo elegibles</option>
                  <option value="vetoed">Solo vetadas</option>
                </select>
                <input
                  type="text"
                  placeholder="Filtrar por genero"
                  value={genreFilter}
                  onChange={(e) => setGenreFilter(e.target.value)}
                />
                <button onClick={pickRandomMovie}>Seleccion aleatoria</button>
              </div>
            </div>

            {randomPick ? (
              <p className="success">Sugerencia: {randomPick.title} ({randomPick.year || 'N/A'})</p>
            ) : null}
            {randomError ? <p className="error">{randomError}</p> : null}

            <ul className="result-list">
              {movies.map((movie) => {
                const ratingState = ratingInputs[movie.id] || {
                  rating: movie.myRating || 3,
                  watchedOn: movie.myWatchedOn || today,
                }

                return (
                  <li key={movie.id} className="movie-item">
                    <div className="movie-main">
                      <strong>
                        {movie.title} {movie.year ? `(${movie.year})` : ''}
                      </strong>
                      <p>{movie.genres.join(', ')}</p>
                      <p className="muted">
                        Anadida por {movie.createdBy} | Nota media: {movie.avgRating || 'N/A'}
                      </p>
                      {movie.isVetoed ? (
                        <p className="error small">
                          Vetada
                          {movie.vetoedBy.length ? ` por pelicula: ${movie.vetoedBy.join(', ')}` : ''}
                          {movie.genreVetoedBy.length
                            ? ` | por genero: ${movie.genreVetoedBy
                                .map((x) => `${x.genre} (${x.username})`)
                                .join(', ')}`
                            : ''}
                        </p>
                      ) : (
                        <p className="success small">Elegible</p>
                      )}
                    </div>

                    <div className="movie-actions">
                      <div className="inline">
                        <button onClick={() => vetoMovie(movie.id)}>Vetar pelicula</button>
                        <button className="ghost" onClick={() => unvetoMovie(movie.id)}>
                          Quitar mi veto
                        </button>
                      </div>

                      <div className="inline rating-row">
                        <span>Puntuacion</span>
                        <input
                          type="number"
                          min="0.5"
                          max="5"
                          step="0.5"
                          value={ratingState.rating}
                          onChange={(e) =>
                            setRatingInputs((prev) => ({
                              ...prev,
                              [movie.id]: {
                                ...ratingState,
                                rating: Number(e.target.value),
                              },
                            }))
                          }
                        />
                        <span>Vista el</span>
                        <input
                          type="date"
                          value={ratingState.watchedOn}
                          onChange={(e) =>
                            setRatingInputs((prev) => ({
                              ...prev,
                              [movie.id]: {
                                ...ratingState,
                                watchedOn: e.target.value,
                              },
                            }))
                          }
                        />
                        <button onClick={() => saveRating(movie.id)}>Guardar</button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="panel full-width">
            <h2>Log de actividad</h2>
            <ul className="result-list logs">
              {logs.map((log) => (
                <li key={log.id} className="movie-item compact">
                  <div>
                    <strong>{log.action}</strong>
                    <p>
                      {log.username || 'sistema'} | {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>
      ) : (
        <section className="panel auth-panel">
          <h2>{authMode === 'login' ? 'Entrar' : 'Crear usuario'}</h2>
          <form onSubmit={handleAuthSubmit} className="stack">
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">
              {authMode === 'login' ? 'Entrar' : 'Registrarme'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
            </button>
          </form>
          {authError ? <p className="error">{authError}</p> : null}
        </section>
      )}
    </div>
  )
}

export default App
