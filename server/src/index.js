require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const path = require('node:path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { db, all, get, run, logAction } = require('./db');
const { searchExternalMovies } = require('./movieSearch');
const { getStreamingInfo } = require('./streamingProvider');
const { signToken, requireAuth } = require('./auth');

const app = express();
const port = process.env.PORT || 4000;

app.disable('x-powered-by');

const allowedOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = allowedOrigins.length
  ? {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origen no permitido por CORS'));
    },
  }
  : { origin: true };

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// Después de app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../../public')));


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

function asBooleanFlag(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function getGlobalListId() {
  const existingGlobal = get(`SELECT id FROM lists WHERE name = ? AND created_by IS NULL LIMIT 1`, ['global']);
  if (existingGlobal) {
    run(
      `
      UPDATE lists
      SET is_public = 1, visibility = 'public', allow_member_add = 1, allow_member_veto = 1
      WHERE id = ?
      `,
      [existingGlobal.id]
    );
    return existingGlobal.id;
  }

  const insert = run(
    `INSERT INTO lists (name, description, is_public, allow_veto, visibility, allow_member_add, allow_member_veto, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    ['global', 'Global shared list', 1, 1, 'public', 1, 1]
  );

  return insert.lastInsertRowid;
}

function getListWithAccess(listId, userId) {
  return get(
    `
    SELECT
      l.id,
      l.name,
      l.description,
      l.cover_url AS coverUrl,
      l.is_public AS isPublic,
      l.allow_veto AS allowVeto,
      l.visibility AS visibility,
      l.invite_code AS inviteCode,
      l.allow_member_add AS allowMemberAdd,
      l.allow_member_veto AS allowMemberVeto,
      l.created_by AS createdBy,
      l.created_at AS createdAt,
      CASE WHEN lm.user_id IS NOT NULL THEN 1 ELSE 0 END AS isMember
    FROM lists l
    LEFT JOIN list_members lm ON lm.list_id = l.id AND lm.user_id = ?
    WHERE l.id = ?
    LIMIT 1
    `,
    [userId, listId]
  );
}

function normalizeVisibility(value, fallback = 'personal') {
  const normalized = String(value || fallback).trim().toLowerCase();
  if (normalized === 'public' || normalized === 'private' || normalized === 'personal') {
    return normalized;
  }
  return fallback;
}

function generateInviteCode() {
  return crypto.randomBytes(16).toString('hex');
}

function canUserViewList(list, userId) {
  if (!list) return false;
  if (Number(list.createdBy) === Number(userId)) return true;
  if (list.visibility === 'public') return true;
  if (list.visibility === 'personal') return false;
  return Boolean(list.isMember);
}

function canUserAddMoviesToList(list, userId) {
  if (!list) return false;
  if (Number(list.createdBy) === Number(userId)) return true;
  if (list.visibility === 'personal') return false;
  if (!list.isMember) return false;
  return Boolean(list.allowMemberAdd);
}

function canUserVetoInList(list, userId) {
  if (!list?.allowVeto) return false;
  if (Number(list.createdBy) === Number(userId)) return true;
  if (list.visibility === 'personal') return false;
  if (!list.isMember) return false;
  return Boolean(list.allowMemberVeto);
}

function buildMovieListByList(listId, currentUserId, allowVeto = true) {
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
        WHERE mv.movie_id = m.id AND mv.list_id = ?
      ) AS vetoCount,
      (
        SELECT GROUP_CONCAT(u2.username, ', ')
        FROM movie_vetoes mv2
        JOIN users u2 ON u2.id = mv2.user_id
        WHERE mv2.movie_id = m.id AND mv2.list_id = ?
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
    WHERE le.list_id = ?
    ORDER BY le.added_at DESC
    `,
    [listId, listId, currentUserId, currentUserId, listId]
  );

  const genreVetoRows = allowVeto
    ? all(
      `
      SELECT gv.genre, u.username
      FROM genre_vetoes gv
      JOIN users u ON u.id = gv.user_id
      WHERE gv.list_id = ?
      `,
      [listId]
    )
    : [];

  return rows.map((row) => {
    const movieGenres = splitGenres(row.genres);
    const matchingGenreVetoes = allowVeto
      ? genreVetoRows.filter((gv) => movieGenres.some((g) => g.toLowerCase() === gv.genre.toLowerCase()))
      : [];

    const vetoedBy = allowVeto && row.vetoedBy
      ? row.vetoedBy.split(',').map((u) => u.trim())
      : [];

    const isVetoed = allowVeto ? row.vetoCount > 0 || matchingGenreVetoes.length > 0 : false;

    return {
      ...row,
      genres: movieGenres,
      vetoedBy,
      genreVetoedBy: matchingGenreVetoes.map((v) => ({
        genre: v.genre,
        username: v.username,
      })),
      isVetoed,
    };
  });
}

function buildMovieList(currentUserId) {
  const globalListId = getGlobalListId();
  const globalList = get(`SELECT allow_veto AS allowVeto FROM lists WHERE id = ?`, [globalListId]);
  return buildMovieListByList(globalListId, currentUserId, Boolean(globalList?.allowVeto));
}

function parseMoviePayload(body) {
  return {
    title: String(body.title || '').trim(),
    externalId: String(body.externalId || '').trim(),
    year: Number.isInteger(body.year) ? body.year : null,
    genres: normalizeGenres(body.genres),
    posterUrl: body.posterUrl ? String(body.posterUrl) : null,
    overview: body.overview ? String(body.overview) : '',
  };
}

async function enrichMoviePayloadIfNeeded(moviePayload) {
  let genresToSave = moviePayload.genres;
  let overviewToSave = moviePayload.overview;

  if ((!genresToSave || genresToSave === '') || !overviewToSave) {
    try {
      const info = await getStreamingInfo(moviePayload.title, moviePayload.year);
      if (info) {
        if ((!genresToSave || genresToSave === '') && Array.isArray(info.genre_names)) {
          genresToSave = normalizeGenres(info.genre_names);
        }

        if (!overviewToSave && info.plot_overview) {
          overviewToSave = String(info.plot_overview);
        }
      }
    } catch (err) {
      console.warn('No se pudo enriquecer pelicula con provider externo:', err.message);
    }
  }

  return {
    ...moviePayload,
    genres: genresToSave,
    overview: overviewToSave,
  };
}

async function resolveMovieIdForRequest(moviePayload, userId) {
  const existing = get(`SELECT id FROM movies WHERE external_id = ?`, [moviePayload.externalId]);
  if (existing) {
    return existing.id;
  }

  const enrichedPayload = await enrichMoviePayloadIfNeeded(moviePayload);
  const insert = run(
    `
    INSERT INTO movies (external_id, title, year, genres, poster_url, overview, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      enrichedPayload.externalId,
      enrichedPayload.title,
      enrichedPayload.year,
      enrichedPayload.genres,
      enrichedPayload.posterUrl,
      enrichedPayload.overview,
      userId,
    ]
  );

  return insert.lastInsertRowid;
}

function resolveTargetListId(rawListId) {
  return Number.isInteger(rawListId) ? rawListId : getGlobalListId();
}

function serializeMovie(movie) {
  return {
    id: movie.id,
    externalId: movie.external_id,
    title: movie.title,
    year: movie.year,
    genres: splitGenres(movie.genres),
    posterUrl: movie.poster_url,
    overview: movie.overview,
  };
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

//Obtener pelicula por externalId
app.get('/api/movies/external/:externalId', requireAuth, (req, res) => {
  const externalId = String(req.params.externalId || '').trim();

  const movie = get(`SELECT * FROM movies WHERE external_id = ?`, [externalId]);

  if (!movie) {
    return res.status(404).json({ error: 'Película no encontrada' });
  }

  return res.json(movie);
});

app.post('/api/movies', requireAuth, async (req, res) => {
  const moviePayload = parseMoviePayload(req.body);

  if (!moviePayload.title || !moviePayload.externalId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const movieId = await resolveMovieIdForRequest(moviePayload, req.user.id);
  const listId = resolveTargetListId(req.body.listId);

  const targetList = getListWithAccess(listId, req.user.id);
  if (!targetList) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserAddMoviesToList(targetList, req.user.id)) {
    return res.status(403).json({ error: 'Debes estar suscrito para anadir peliculas a esta lista' });
  }

  run(
    `
    INSERT INTO list_entries (list_id, movie_id, added_by)
    VALUES (?, ?, ?)
    ON CONFLICT(list_id, movie_id) DO NOTHING
    `,
    [listId, movieId, req.user.id]
  );

  logAction('movie_added', { movieId, title: moviePayload.title, listId }, req.user.id);

  const movie = get(`SELECT * FROM movies WHERE id = ?`, [movieId]);
  return res.status(201).json(serializeMovie(movie));
});

//Creamos una lista y añadimos al usuario que la creeo a su lista
app.post('/api/lists', requireAuth, (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const coverUrl = req.body.coverUrl ? String(req.body.coverUrl).trim() : null;
  const visibility = normalizeVisibility(req.body.visibility, asBooleanFlag(req.body.isPublic, false) ? 'public' : 'personal');
  const isPublic = visibility === 'public';
  const allowVeto = asBooleanFlag(req.body.allowVeto, true);
  const allowMemberAdd = asBooleanFlag(req.body.allowMemberAdd, true);
  const allowMemberVeto = asBooleanFlag(req.body.allowMemberVeto, true);
  const inviteCode = visibility === 'private' ? generateInviteCode() : null;

  if (!name) {
    return res.status(400).json({ error: 'Nombre de lista requerido' });
  }

  const existing = get(`SELECT id FROM lists WHERE name = ? AND created_by = ?`, [name, req.user.id]);
  if (existing) {
    return res.status(409).json({ error: 'Ya existe una lista con ese nombre para este usuario' });
  }

  const createListTransaction = db.transaction((payload) => {
    const insert = run(
      `INSERT INTO lists (name, description, cover_url, is_public, allow_veto, visibility, invite_code, allow_member_add, allow_member_veto, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.name,
        payload.description,
        payload.coverUrl,
        payload.isPublic ? 1 : 0,
        payload.allowVeto ? 1 : 0,
        payload.visibility,
        payload.inviteCode,
        payload.allowMemberAdd ? 1 : 0,
        payload.allowMemberVeto ? 1 : 0,
        payload.userId,
      ]
    );
    const listId = insert.lastInsertRowid;
    run(`INSERT INTO list_members (list_id, user_id) VALUES (?, ?)`, [listId, payload.userId]);
    return listId;
  });

  try {
    const newListId = createListTransaction({
      name,
      description,
      coverUrl,
      isPublic,
      allowVeto,
      visibility,
      inviteCode,
      allowMemberAdd,
      allowMemberVeto,
      userId: req.user.id,
    });
    logAction('list_created', { listId: newListId, name, visibility, allowVeto, allowMemberAdd, allowMemberVeto, coverUrl }, req.user.id);
    return res.status(201).json({
      id: newListId,
      name,
      description,
      coverUrl,
      visibility,
      inviteCode,
      isPublic,
      allowVeto,
      allowMemberAdd,
      allowMemberVeto,
      isOwner: true,
      isMember: true,
    });
  } catch (error) {
    console.error('Error creando lista:', error);
    return res.status(500).json({ error: 'Error al crear la lista' });
  }
});

//Eliminamos una lista y todas sus asociaciones
app.delete('/api/lists/:listId', requireAuth, (req, res) => {
  const listId = Number(req.params.listId);
  const list = get(`SELECT id, name FROM lists WHERE id = ? AND created_by = ?`, [listId, req.user.id]);
  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  run(`DELETE FROM list_entries WHERE list_id = ?`, [listId]);
  run(`DELETE FROM movie_vetoes WHERE list_id = ?`, [listId]);
  run(`DELETE FROM genre_vetoes WHERE list_id = ?`, [listId]);
  run(`DELETE FROM list_members WHERE list_id = ?`, [listId]);

  run(`DELETE FROM lists WHERE id = ?`, [listId]);

  logAction('list_deleted', { listId, name: list.name }, req.user.id);

  return res.json({ ok: true });
});

// Obtener todas las listas del usuario
app.get('/api/lists', requireAuth, (req, res) => {
  const lists = all(
    `
    SELECT
      l.id,
      l.name,
      l.description,
      l.cover_url AS coverUrl,
      l.is_public AS isPublic,
      l.allow_veto AS allowVeto,
      l.visibility AS visibility,
      l.invite_code AS inviteCode,
      l.allow_member_add AS allowMemberAdd,
      l.allow_member_veto AS allowMemberVeto,
      l.created_by AS createdBy,
      l.created_at AS createdAt,
      CASE WHEN l.created_by = ? THEN 1 ELSE 0 END AS isOwner,
      CASE WHEN lm.user_id IS NOT NULL THEN 1 ELSE 0 END AS isMember
    FROM lists l
    LEFT JOIN list_members lm ON lm.list_id = l.id AND lm.user_id = ?
    WHERE l.created_by = ? OR (lm.user_id = ? AND l.visibility <> 'personal')
    ORDER BY l.created_at DESC
    `,
    [req.user.id, req.user.id, req.user.id, req.user.id]
  );

  return res.status(200).json(
    lists.map((list) => ({
      ...list,
      visibility: normalizeVisibility(list.visibility, list.isPublic ? 'public' : 'personal'),
      isPublic: Boolean(list.isPublic),
      allowVeto: Boolean(list.allowVeto),
      allowMemberAdd: Boolean(list.allowMemberAdd),
      allowMemberVeto: Boolean(list.allowMemberVeto),
      inviteCode: list.isOwner ? list.inviteCode : null,
      isOwner: Boolean(list.isOwner),
      isMember: Boolean(list.isMember) || Boolean(list.isOwner),
    }))
  );
});

app.get('/api/lists/public', requireAuth, (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  const rows = all(
    `
    SELECT
      l.id,
      l.name,
      l.description,
      l.cover_url AS coverUrl,
      l.is_public AS isPublic,
      l.allow_veto AS allowVeto,
      l.visibility AS visibility,
      l.allow_member_add AS allowMemberAdd,
      l.allow_member_veto AS allowMemberVeto,
      l.created_at AS createdAt,
      u.username AS ownerUsername,
      CASE WHEN lm.user_id IS NOT NULL THEN 1 ELSE 0 END AS isMember
    FROM lists l
    LEFT JOIN users u ON u.id = l.created_by
    LEFT JOIN list_members lm ON lm.list_id = l.id AND lm.user_id = ?
    WHERE l.visibility = 'public'
      AND l.created_by <> ?
      AND (
        ? = ''
        OR lower(l.name) LIKE '%' || ? || '%'
        OR lower(l.description) LIKE '%' || ? || '%'
      )
    ORDER BY l.created_at DESC
    LIMIT 100
    `,
    [req.user.id, req.user.id, query, query, query]
  );

  return res.json(
    rows.map((row) => ({
      ...row,
      visibility: normalizeVisibility(row.visibility, 'public'),
      isPublic: Boolean(row.isPublic),
      allowVeto: Boolean(row.allowVeto),
      allowMemberAdd: Boolean(row.allowMemberAdd),
      allowMemberVeto: Boolean(row.allowMemberVeto),
      isMember: Boolean(row.isMember),
    }))
  );
});

app.post('/api/lists/:listId/subscribe', requireAuth, (req, res) => {
  const listId = Number(req.params.listId);
  const list = get(`SELECT id, name, visibility, created_by AS createdBy FROM lists WHERE id = ?`, [listId]);

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (Number(list.createdBy) === Number(req.user.id)) {
    return res.status(200).json({ ok: true });
  }

  if (list.visibility !== 'public') {
    return res.status(403).json({ error: 'Esta lista requiere enlace privado para suscribirse' });
  }

  run(
    `INSERT INTO list_members (list_id, user_id) VALUES (?, ?) ON CONFLICT(list_id, user_id) DO NOTHING`,
    [listId, req.user.id]
  );

  logAction('list_subscribed', { listId, name: list.name, method: 'public' }, req.user.id);

  return res.status(201).json({ ok: true });
});

app.post('/api/lists/subscribe/:inviteCode', requireAuth, (req, res) => {
  const inviteCode = String(req.params.inviteCode || '').trim();
  const list = get(
    `SELECT id, name, visibility, invite_code AS inviteCode, created_by AS createdBy FROM lists WHERE invite_code = ? LIMIT 1`,
    [inviteCode]
  );

  if (!list) {
    return res.status(404).json({ error: 'Enlace de invitacion invalido' });
  }

  if (Number(list.createdBy) === Number(req.user.id)) {
    return res.status(200).json({ ok: true });
  }

  if (list.visibility !== 'private') {
    return res.status(400).json({ error: 'Este enlace no pertenece a una lista privada' });
  }

  run(
    `INSERT INTO list_members (list_id, user_id) VALUES (?, ?) ON CONFLICT(list_id, user_id) DO NOTHING`,
    [list.id, req.user.id]
  );

  logAction('list_subscribed', { listId: list.id, name: list.name, method: 'invite' }, req.user.id);

  return res.status(201).json({ ok: true, listId: list.id });
});

app.patch('/api/lists/:listId/settings', requireAuth, (req, res) => {
  const listId = Number(req.params.listId);
  const current = get(
    `SELECT id, invite_code AS inviteCode, visibility FROM lists WHERE id = ? AND created_by = ?`,
    [listId, req.user.id]
  );

  if (!current) {
    return res.status(404).json({ error: 'Lista no encontrada o sin permisos' });
  }

  const description = req.body.description === undefined ? null : String(req.body.description || '').trim();
  const coverUrl = req.body.coverUrl === undefined ? null : String(req.body.coverUrl || '').trim();
  const visibility = req.body.visibility === undefined ? null : normalizeVisibility(req.body.visibility, current.visibility || 'personal');
  const allowVeto = req.body.allowVeto === undefined ? null : asBooleanFlag(req.body.allowVeto, true);
  const allowMemberAdd = req.body.allowMemberAdd === undefined ? null : asBooleanFlag(req.body.allowMemberAdd, true);
  const allowMemberVeto = req.body.allowMemberVeto === undefined ? null : asBooleanFlag(req.body.allowMemberVeto, true);

  const nextVisibility = visibility || normalizeVisibility(current.visibility, 'personal');
  const isPublicDbValue = visibility === null ? null : Number(nextVisibility === 'public');
  const allowVetoDbValue = allowVeto === null ? null : Number(allowVeto);
  const allowMemberAddDbValue = allowMemberAdd === null ? null : Number(allowMemberAdd);
  const allowMemberVetoDbValue = allowMemberVeto === null ? null : Number(allowMemberVeto);
  const inviteCode = nextVisibility === 'private'
    ? (current.inviteCode || generateInviteCode())
    : null;

  run(
    `
    UPDATE lists
    SET
      description = COALESCE(?, description),
      cover_url = COALESCE(?, cover_url),
      visibility = COALESCE(?, visibility),
      is_public = COALESCE(?, is_public),
      allow_veto = COALESCE(?, allow_veto),
      allow_member_add = COALESCE(?, allow_member_add),
      allow_member_veto = COALESCE(?, allow_member_veto),
      invite_code = ?
    WHERE id = ?
    `,
    [
      description,
      coverUrl,
      visibility,
      isPublicDbValue,
      allowVetoDbValue,
      allowMemberAddDbValue,
      allowMemberVetoDbValue,
      inviteCode,
      listId,
    ]
  );

  const updated = get(
    `
    SELECT
      id,
      name,
      description,
      cover_url AS coverUrl,
      is_public AS isPublic,
      allow_veto AS allowVeto,
      visibility,
      invite_code AS inviteCode,
      allow_member_add AS allowMemberAdd,
      allow_member_veto AS allowMemberVeto
    FROM lists
    WHERE id = ?
    `,
    [listId]
  );

  return res.json({
    ...updated,
    visibility: normalizeVisibility(updated.visibility, updated.isPublic ? 'public' : 'personal'),
    isPublic: Boolean(updated.isPublic),
    allowVeto: Boolean(updated.allowVeto),
    allowMemberAdd: Boolean(updated.allowMemberAdd),
    allowMemberVeto: Boolean(updated.allowMemberVeto),
  });
});

// Obtener una lista por id (solo si el usuario es miembro)
app.get('/api/lists/id/:listId', requireAuth, (req, res) => {
  const listId = Number(req.params.listId);
  const list = getListWithAccess(listId, req.user.id);
  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserViewList(list, req.user.id)) {
    return res.status(403).json({ error: 'No tienes acceso a esta lista' });
  }

  return res.status(200).json({
    ...list,
    visibility: normalizeVisibility(list.visibility, list.isPublic ? 'public' : 'personal'),
    isPublic: Boolean(list.isPublic),
    allowVeto: Boolean(list.allowVeto),
    allowMemberAdd: Boolean(list.allowMemberAdd),
    allowMemberVeto: Boolean(list.allowMemberVeto),
    inviteCode: Number(list.createdBy) === Number(req.user.id) ? list.inviteCode : null,
    isOwner: list.createdBy === req.user.id,
    isMember: Boolean(list.isMember),
  });
});

// Obtener una lista por nombre (solo si el usuario es miembro)
app.get('/api/lists/name/:listName', requireAuth, (req, res) => {
  const listName = String(req.params.listName || '').trim();
  const list = get(
    `
    SELECT
      l.id,
      l.name,
      l.description,
      l.cover_url AS coverUrl,
      l.is_public AS isPublic,
      l.allow_veto AS allowVeto,
      l.visibility AS visibility,
      l.invite_code AS inviteCode,
      l.allow_member_add AS allowMemberAdd,
      l.allow_member_veto AS allowMemberVeto,
      l.created_by AS createdBy,
      l.created_at AS createdAt,
      CASE WHEN lm.user_id IS NOT NULL THEN 1 ELSE 0 END AS isMember
    FROM lists l
    LEFT JOIN list_members lm ON lm.list_id = l.id AND lm.user_id = ?
    WHERE l.name = ?
      AND (l.created_by = ? OR (lm.user_id = ? AND l.visibility <> 'personal') OR l.visibility = 'public')
    ORDER BY
      CASE
        WHEN l.created_by = ? THEN 0
        WHEN lm.user_id IS NOT NULL THEN 1
        ELSE 2
      END,
      l.created_at DESC
    LIMIT 1
    `,
    [req.user.id, listName, req.user.id, req.user.id, req.user.id]
  );
  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  return res.status(200).json({
    ...list,
    visibility: normalizeVisibility(list.visibility, list.isPublic ? 'public' : 'personal'),
    isPublic: Boolean(list.isPublic),
    allowVeto: Boolean(list.allowVeto),
    allowMemberAdd: Boolean(list.allowMemberAdd),
    allowMemberVeto: Boolean(list.allowMemberVeto),
    inviteCode: Number(list.createdBy) === Number(req.user.id) ? list.inviteCode : null,
    isOwner: list.createdBy === req.user.id,
    isMember: Boolean(list.isMember),
  });
});

// Obtener peliculas de una lista
app.get('/api/lists/:listId/movies', requireAuth, (req, res) => {
  const listId = Number(req.params.listId);
  const list = getListWithAccess(listId, req.user.id);

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserViewList(list, req.user.id)) {
    return res.status(403).json({ error: 'No tienes acceso a esta lista' });
  }

  const movies = buildMovieListByList(listId, req.user.id, Boolean(list.allowVeto));

  return res.status(200).json(movies);
});

//Añadir una pelicula a una lista
app.post('/api/lists/:listId/add-movie', requireAuth, (req, res) => {
  const listId = Number(req.params.listId);
  const movieId = Number(req.body.id);
  const list = getListWithAccess(listId, req.user.id);

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserAddMoviesToList(list, req.user.id)) {
    return res.status(403).json({ error: 'No tienes permisos para añadir peliculas a esta lista' });
  }

  run(`INSERT INTO list_entries (list_id, movie_id, added_by) VALUES (?, ?, ?) ON CONFLICT(list_id, movie_id) DO NOTHING`, [listId, movieId, req.user.id]);
  return res.status(201).json({ ok: true });
});

//Eliminar una pelicula de una lista
app.post('/api/lists/:listId/remove-movie', requireAuth, (req, res) => {
  const listId = Number(req.params.listId);
  const movieId = Number(req.body.id);
  const list = getListWithAccess(listId, req.user.id);

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserAddMoviesToList(list, req.user.id)) {
    return res.status(403).json({ error: 'No tienes permisos para quitar peliculas de esta lista' });
  }

  run(`DELETE FROM list_entries WHERE list_id = ? AND movie_id = ?`, [listId, movieId]);
  return res.json({ ok: true });
});

app.post('/api/movies/:id/veto', requireAuth, (req, res) => {
  const movieId = Number(req.params.id);
  const requestedListId = Number(req.body.listId || req.query.listId || getGlobalListId());
  const list = getListWithAccess(requestedListId, req.user.id);

  const movie = get(`SELECT id, title FROM movies WHERE id = ?`, [movieId]);

  if (!movie) {
    return res.status(404).json({ error: 'Pelicula no encontrada' });
  }

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserVetoInList(list, req.user.id)) {
    return res.status(403).json({ error: 'No tienes permisos de veto en esta lista' });
  }

  run(
    `INSERT INTO movie_vetoes (user_id, movie_id, list_id) VALUES (?, ?, ?) ON CONFLICT(user_id, movie_id, list_id) DO NOTHING`,
    [req.user.id, movieId, requestedListId]
  );

  logAction('movie_vetoed', { movieId, title: movie.title, listId: requestedListId }, req.user.id);

  return res.status(201).json({ ok: true });
});

app.delete('/api/movies/:id', requireAuth, (req, res) => {
  const movieId = Number(req.params.id);

  const movie = get(`SELECT id, title FROM movies WHERE id = ?`, [movieId]);

  if (!movie) {
    return res.status(404).json({ error: 'Pelicula no encontrada' });
  }

  // Remove the movie from list_entries for this user (if they were the one who added it)
  run(`DELETE FROM list_entries WHERE movie_id = ? AND added_by = ?`, [movieId, req.user.id]);

  logAction('movie_removed_from_list', { movieId, title: movie.title }, req.user.id);

  return res.json({ ok: true });
});

// Remove by external id convenience endpoint
app.delete('/api/movies/external/:externalId', requireAuth, (req, res) => {
  const externalId = String(req.params.externalId || '').trim();

  const movie = get(`SELECT id, title FROM movies WHERE external_id = ?`, [externalId]);

  if (!movie) {
    return res.status(404).json({ error: 'Pelicula no encontrada' });
  }

  run(`DELETE FROM list_entries WHERE movie_id = ? AND added_by = ?`, [movie.id, req.user.id]);

  logAction('movie_removed_from_list', { movieId: movie.id, title: movie.title }, req.user.id);

  return res.json({ ok: true });
});

app.delete('/api/movies/:id/veto', requireAuth, (req, res) => {
  const movieId = Number(req.params.id);
  const requestedListId = Number(req.body?.listId || req.query.listId || getGlobalListId());
  const list = getListWithAccess(requestedListId, req.user.id);

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserVetoInList(list, req.user.id)) {
    return res.status(403).json({ error: 'No tienes permisos de veto en esta lista' });
  }

  run(`DELETE FROM movie_vetoes WHERE user_id = ? AND movie_id = ? AND list_id = ?`, [
    req.user.id,
    movieId,
    requestedListId,
  ]);

  logAction('movie_veto_removed', { movieId, listId: requestedListId }, req.user.id);

  return res.json({ ok: true });
});

app.get('/api/veto-genres', requireAuth, (req, res) => {
  const listId = Number(req.query.listId || getGlobalListId());
  const list = getListWithAccess(listId, req.user.id);

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserViewList(list, req.user.id)) {
    return res.status(403).json({ error: 'No tienes acceso a esta lista' });
  }

  const rows = all(
    `
    SELECT gv.id, gv.genre, gv.created_at AS createdAt, u.username
    FROM genre_vetoes gv
    JOIN users u ON u.id = gv.user_id
    WHERE gv.list_id = ?
    ORDER BY gv.created_at DESC
    `,
    [listId]
  );

  return res.json(rows);
});

app.post('/api/veto-genres', requireAuth, (req, res) => {
  const genre = String(req.body.genre || '').trim();
  const listId = Number(req.body.listId || getGlobalListId());
  const list = getListWithAccess(listId, req.user.id);

  if (!genre) {
    return res.status(400).json({ error: 'Genero requerido' });
  }

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserVetoInList(list, req.user.id)) {
    return res.status(403).json({ error: 'No tienes permisos de veto en esta lista' });
  }

  run(
    `INSERT INTO genre_vetoes (user_id, list_id, genre) VALUES (?, ?, ?) ON CONFLICT(user_id, list_id, genre) DO NOTHING`,
    [req.user.id, listId, genre]
  );

  logAction('genre_vetoed', { genre, listId }, req.user.id);

  return res.status(201).json({ ok: true });
});

app.delete('/api/veto-genres/:genre', requireAuth, (req, res) => {
  const genre = String(req.params.genre || '').trim();
  const listId = Number(req.query.listId || getGlobalListId());
  const list = getListWithAccess(listId, req.user.id);

  if (!list) {
    return res.status(404).json({ error: 'Lista no encontrada' });
  }

  if (!canUserVetoInList(list, req.user.id)) {
    return res.status(403).json({ error: 'No tienes permisos de veto en esta lista' });
  }

  run(`DELETE FROM genre_vetoes WHERE user_id = ? AND list_id = ? AND genre = ?`, [req.user.id, listId, genre]);

  logAction('genre_veto_removed', { genre, listId }, req.user.id);

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

app.use('/', (req, res, next) => {
  // Skip si es una ruta API
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Servir index.html como fallback para React
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}`);
});

// Ensure there is a default public list named 'global'
try {
  getGlobalListId();
} catch (err) {
  console.error('Error inicializando lista global:', err.message);
}
