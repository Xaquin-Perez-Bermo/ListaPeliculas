require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const { all, get, run, logAction } = require('./db');
const { searchExternalMovies } = require('./movieSearch');
const { getStreamingInfo } = require('./streamingProvider');
const { signToken, requireAuth } = require('./auth');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

function normalizeGenres(genres) {
  if (!Array.isArray(genres)) {
    return '';
  }

  return genres
    .map((g) => String(g || '').trim())
    .filter(Boolean)
    .join(',');
}

function splitGenres(raw) {
  return String(raw || '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
}

async function fetchOmdbGenresByImdbId(imdbId) {
  const apiKey = process.env.OMDB_API_KEY || '263d22d8';

  const response = await fetch(
    `https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(apiKey)}`
  );

  if (!response.ok) return [];

  const data = await response.json();
  if (data.Response === 'False') return [];

  return splitGenres(data.Genre);
}

async function hydrateMissingGenres(movies) {
  const missing = movies.filter(
    (movie) =>
      (!movie.genres || movie.genres.length === 0) &&
      typeof movie.externalId === 'string' &&
      movie.externalId.startsWith('omdb-')
  );

  if (!missing.length) return false;

  let updated = false;

  await Promise.all(
    missing.map(async (movie) => {
      const imdbId = movie.externalId.replace('omdb-', '').trim();
      if (!imdbId) return;

      try {
        const genres = await fetchOmdbGenresByImdbId(imdbId);
        if (!genres.length) return;

        run(`UPDATE movies SET genres = ? WHERE id = ?`, [normalizeGenres(genres), movie.id]);
        updated = true;
      } catch {
        // Ignore OMDB errors and continue serving data
      }
    })
  );

  return updated;
}

function buildMovieList(currentUserId) {
  const rows = all(
    `
    SELECT
      m.id,
      m.external_id AS externalId,
      m.title,
      m.year,
      m.genres,
      m.poster_url AS posterUrl,
      m.overview,
      m.created_at AS createdAt,
      u.username AS createdBy,
      le.added_at AS addedAt,
      (
        SELECT COUNT(*) FROM movie_vetoes mv
        WHERE mv.movie_id = m.id
      ) AS vetoCount,
      (
        SELECT GROUP_CONCAT(u2.username, ', ')
        FROM movie_vetoes mv2
        JOIN users u2 ON u2.id = mv2.user_id
        WHERE mv2.movie_id = m.id
      ) AS vetoedBy,
      (
        SELECT ROUND(AVG(r.rating), 2)
        FROM ratings r
        WHERE r.movie_id = m.id
      ) AS avgRating,
      (
        SELECT r2.rating
        FROM ratings r2
        WHERE r2.movie_id = m.id AND r2.user_id = ?
      ) AS myRating,
      (
        SELECT r3.watched_on
        FROM ratings r3
        WHERE r3.movie_id = m.id AND r3.user_id = ?
      ) AS myWatchedOn
    FROM list_entries le
    JOIN movies m ON m.id = le.movie_id
    JOIN users u ON u.id = m.created_by
    ORDER BY le.added_at DESC
    `,
    [currentUserId, currentUserId]
  );

  const genreVetoRows = all(
    `
    SELECT gv.genre, u.username
    FROM genre_vetoes gv
    JOIN users u ON u.id = gv.user_id
    `
  );

  return rows.map((row) => {
    const movieGenres = splitGenres(row.genres);
    const matchingGenreVetoes = genreVetoRows.filter((gv) =>
      movieGenres.some((g) => g.toLowerCase() === gv.genre.toLowerCase())
    );

    return {
      ...row,
      genres: movieGenres,
      vetoedBy: row.vetoedBy ? row.vetoedBy.split(',').map((u) => u.trim()) : [],
      genreVetoedBy: matchingGenreVetoes.map((v) => ({
        genre: v.genre,
        username: v.username,
      })),
      isVetoed: row.vetoCount > 0 || matchingGenreVetoes.length > 0,
    };
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (username.length < 3) {
    return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'La password debe tener al menos 4 caracteres' });
  }

  const existing = get(`SELECT id FROM users WHERE username = ?`, [username]);

  if (existing) {
    return res.status(409).json({ error: 'El usuario ya existe' });
  }

  const hash = await bcrypt.hash(password, 10);
  const insert = run(
    `INSERT INTO users (username, password_hash) VALUES (?, ?)`,
    [username, hash]
  );

  const user = { id: insert.lastInsertRowid, username };
  const token = signToken(user);

  logAction('register', { username }, user.id);

  return res.status(201).json({ token, user });
});

app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  const user = get(`SELECT * FROM users WHERE username = ?`, [username]);

  if (!user) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const token = signToken(user);
  logAction('login', { username }, user.id);

  return res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({ id: req.user.id, username: req.user.username });
});

app.get('/api/discover', requireAuth, async (req, res) => {
  try {
    const results = await searchExternalMovies(req.query.q);
    return res.json(results);
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

app.get('/api/movies', requireAuth, async (req, res) => {
  const status = String(req.query.status || 'all');
  const genreFilter = String(req.query.genre || '').trim().toLowerCase();

  let movies = buildMovieList(req.user.id);

  const hydrated = await hydrateMissingGenres(movies);
  if (hydrated) {
    movies = buildMovieList(req.user.id);
  }

  if (genreFilter) {
    movies = movies.filter((m) =>
      m.genres.some((g) => g.toLowerCase().includes(genreFilter))
    );
  }

  if (status === 'active') {
    movies = movies.filter((m) => !m.isVetoed);
  }

  if (status === 'vetoed') {
    movies = movies.filter((m) => m.isVetoed);
  }

  return res.json(movies);
});

app.post('/api/movies', requireAuth, (req, res) => {
  const title = String(req.body.title || '').trim();
  const externalId = String(req.body.externalId || '').trim();

  if (!title || !externalId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const existing = get(`SELECT id FROM movies WHERE external_id = ?`, [externalId]);

  let movieId;

  if (existing) {
    movieId = existing.id;
  } else {
    const insert = run(
      `
      INSERT INTO movies (external_id, title, year, genres, poster_url, overview, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        externalId,
        title,
        Number.isInteger(req.body.year) ? req.body.year : null,
        normalizeGenres(req.body.genres),
        req.body.posterUrl ? String(req.body.posterUrl) : null,
        req.body.overview ? String(req.body.overview) : '',
        req.user.id,
      ]
    );

    movieId = insert.lastInsertRowid;
  }

  run(
    `
    INSERT INTO list_entries (movie_id, added_by)
    VALUES (?, ?)
    ON CONFLICT(movie_id) DO NOTHING
    `,
    [movieId, req.user.id]
  );

  logAction('movie_added', { movieId, title }, req.user.id);

  const movie = get(`SELECT * FROM movies WHERE id = ?`, [movieId]);
  return res.status(201).json({
    id: movie.id,
    externalId: movie.external_id,
    title: movie.title,
    year: movie.year,
    genres: splitGenres(movie.genres),
    posterUrl: movie.poster_url,
    overview: movie.overview,
  });
});

app.post('/api/movies/:id/veto', requireAuth, (req, res) => {
  const movieId = Number(req.params.id);

  const movie = get(`SELECT id, title FROM movies WHERE id = ?`, [movieId]);

  if (!movie) {
    return res.status(404).json({ error: 'Pelicula no encontrada' });
  }

  run(
    `INSERT INTO movie_vetoes (user_id, movie_id) VALUES (?, ?) ON CONFLICT(user_id, movie_id) DO NOTHING`,
    [req.user.id, movieId]
  );

  logAction('movie_vetoed', { movieId, title: movie.title }, req.user.id);

  return res.status(201).json({ ok: true });
});

app.delete('/api/movies/:id', requireAuth, (req, res) => {
  const movieId = Number(req.params.id);

  const movie = get(`SELECT id, title FROM movies WHERE id = ?`, [movieId]);

  if (!movie) {
    return res.status(404).json({ error: 'Pelicula no encontrada' });
  }

  run(
    `DELETE FROM movie_vetoes WHERE user_id = ? AND movie_id = ?`,
    [req.user.id, movieId]
  );

  logAction('movie_vetoed', { movieId, title: movie.title }, req.user.id);

  return res.status(201).json({ ok: true });
});

app.delete('/api/movies/:id/veto', requireAuth, (req, res) => {
  const movieId = Number(req.params.id);

  run(`DELETE FROM movie_vetoes WHERE user_id = ? AND movie_id = ?`, [
    req.user.id,
    movieId,
  ]);

  logAction('movie_veto_removed', { movieId }, req.user.id);

  return res.json({ ok: true });
});

app.get('/api/veto-genres', requireAuth, (_req, res) => {
  const rows = all(
    `
    SELECT gv.id, gv.genre, gv.created_at AS createdAt, u.username
    FROM genre_vetoes gv
    JOIN users u ON u.id = gv.user_id
    ORDER BY gv.created_at DESC
    `
  );

  return res.json(rows);
});

app.post('/api/veto-genres', requireAuth, (req, res) => {
  const genre = String(req.body.genre || '').trim();

  if (!genre) {
    return res.status(400).json({ error: 'Genero requerido' });
  }

  run(
    `INSERT INTO genre_vetoes (user_id, genre) VALUES (?, ?) ON CONFLICT(user_id, genre) DO NOTHING`,
    [req.user.id, genre]
  );

  logAction('genre_vetoed', { genre }, req.user.id);

  return res.status(201).json({ ok: true });
});

app.delete('/api/veto-genres/:genre', requireAuth, (req, res) => {
  const genre = String(req.params.genre || '').trim();

  run(`DELETE FROM genre_vetoes WHERE user_id = ? AND genre = ?`, [req.user.id, genre]);

  logAction('genre_veto_removed', { genre }, req.user.id);

  return res.json({ ok: true });
});

app.post('/api/movies/:id/rating', requireAuth, (req, res) => {
  const movieId = Number(req.params.id);
  const rating = Number(req.body.rating);
  const watchedOn = String(req.body.watchedOn || '').trim();

  if (Number.isNaN(rating) || rating < 0.5 || rating > 5) {
    return res.status(400).json({ error: 'La puntuacion debe estar entre 0.5 y 5' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(watchedOn)) {
    return res.status(400).json({ error: 'Formato de fecha invalido (YYYY-MM-DD)' });
  }

  const movie = get(`SELECT id, title FROM movies WHERE id = ?`, [movieId]);

  if (!movie) {
    return res.status(404).json({ error: 'Pelicula no encontrada' });
  }

  run(
    `
    INSERT INTO ratings (user_id, movie_id, rating, watched_on, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, movie_id)
    DO UPDATE SET rating = excluded.rating, watched_on = excluded.watched_on, updated_at = datetime('now')
    `,
    [req.user.id, movieId, rating, watchedOn]
  );

  logAction('movie_rated', { movieId, rating, watchedOn }, req.user.id);

  return res.status(201).json({ ok: true });
});

app.delete('/api/movies/:id/rating', requireAuth, (req, res) => {
  const movieId = Number(req.params.id);
  const movie = get(`SELECT id, title FROM movies WHERE id = ?`, [movieId]);

  if (!movie) {
    return res.status(404).json({ error: 'Pelicula no encontrada' });
  }

  run(`DELETE FROM ratings WHERE user_id = ? AND movie_id = ?`, [req.user.id, movieId]);

  logAction('movie_rating_removed', { movieId, title: movie.title }, req.user.id);

  return res.json({ ok: true });
});

app.get('/api/streaming-info', requireAuth, async (req, res) => {
  const title = String(req.query.title || '').trim();
  const year = req.query.year ? Number(req.query.year) : null;

  if (!title) {
    return res.status(400).json({ error: 'Se requiere titulo' });
  }

  try {
    const data = await getStreamingInfo(title, year);
    return res.json(data);
  } catch (err) {
    if (err.code === 'PROVIDER_NOT_CONFIGURED') {
      return res.status(503).json({ error: err.message });
    }
    return res.status(502).json({ error: 'Error al consultar el proveedor de streaming' });
  }
});

app.get('/api/movies/:id/ratings', requireAuth, (req, res) => {
  const movieId = Number(req.params.id);

  const ratings = all(
    `
    SELECT r.rating, r.watched_on AS watchedOn, r.updated_at AS updatedAt, u.username
    FROM ratings r
    JOIN users u ON u.id = r.user_id
    WHERE r.movie_id = ?
    ORDER BY r.updated_at DESC
    `,
    [movieId]
  );

  return res.json(ratings);
});

app.get('/api/random-pick', requireAuth, (_req, res) => {
  const movies = buildMovieList(req.user.id).filter((movie) => !movie.isVetoed);

  if (!movies.length) {
    return res.status(404).json({ error: 'No hay peliculas elegibles para seleccionar' });
  }

  const pick = movies[Math.floor(Math.random() * movies.length)];

  logAction('random_pick', { movieId: pick.id, title: pick.title }, req.user.id);

  return res.json(pick);
});

app.get('/api/logs', requireAuth, (_req, res) => {
  const rows = all(
    `
    SELECT l.id, l.action, l.payload, l.created_at AS createdAt, u.username
    FROM action_logs l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.id DESC
    LIMIT 100
    `
  );

  return res.json(
    rows.map((r) => ({
      ...r,
      payload: r.payload ? JSON.parse(r.payload) : null,
    }))
  );
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}`);
});
