const path = require('node:path');
const fs = require('node:fs');
const initSqlJs = require('sql.js');

const dbPath = process.env.DB_FILE_PATH
  ? path.resolve(process.env.DB_FILE_PATH)
  : path.join(__dirname, '..', 'data.sqlite');

let sql = null;
let sqlDb = null;
let transactionDepth = 0;
let pendingPersist = false;

const db = {
  exec(query) {
    ensureReady();
    sqlDb.exec(query);
    schedulePersist();
  },
  transaction(callback) {
    return (...args) => {
      ensureReady();
      beginTransaction();

      try {
        const result = callback(...args);
        commitTransaction();
        return result;
      } catch (error) {
        rollbackTransaction();
        throw error;
      }
    };
  },
};

async function initDb() {
  if (sqlDb) {
    return db;
  }

  sql = await initSqlJs({
    locateFile(file) {
      return path.join(path.dirname(require.resolve('sql.js/dist/sql-wasm.js')), file);
    },
  });

  const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  sqlDb = fileBuffer ? new sql.Database(fileBuffer) : new sql.Database();

  sqlDb.exec('PRAGMA foreign_keys = ON;');

  initializeSchema();

  return db;
}

function ensureReady() {
  if (!sqlDb) {
    throw new Error('Database not initialized. Call initDb() before using db accessors.');
  }
}

function persistDb() {
  ensureReady();
  fs.writeFileSync(dbPath, Buffer.from(sqlDb.export()));
}

function schedulePersist() {
  if (transactionDepth > 0) {
    pendingPersist = true;
    return;
  }

  persistDb();
}

function beginTransaction() {
  transactionDepth += 1;
  executeRun('BEGIN');
}

function commitTransaction() {
  executeRun('COMMIT');
  transactionDepth = Math.max(0, transactionDepth - 1);

  if (transactionDepth === 0 && pendingPersist) {
    pendingPersist = false;
    persistDb();
  }
}

function rollbackTransaction() {
  try {
    executeRun('ROLLBACK');
  } finally {
    transactionDepth = Math.max(0, transactionDepth - 1);
    if (transactionDepth === 0) {
      pendingPersist = false;
    }
  }
}

function executeRun(query, params = []) {
  ensureReady();
  const statement = sqlDb.prepare(query);

  try {
    if (params.length) {
      statement.bind(params);
    }

    while (statement.step()) {
      // Consume statement rows for commands that may return metadata.
    }

    return {
      changes: sqlDb.getRowsModified(),
      lastInsertRowid: getLastInsertRowid(),
    };
  } finally {
    statement.free();
  }
}

function getLastInsertRowid() {
  const statement = sqlDb.prepare(`SELECT last_insert_rowid() AS id`);

  try {
    if (!statement.step()) {
      return 0;
    }

    const row = statement.getAsObject();
    return Number(row.id || 0);
  } finally {
    statement.free();
  }
}

function executeGet(query, params = []) {
  ensureReady();
  const statement = sqlDb.prepare(query);

  try {
    if (params.length) {
      statement.bind(params);
    }

    if (!statement.step()) {
      return undefined;
    }

    return statement.getAsObject();
  } finally {
    statement.free();
  }
}

function executeAll(query, params = []) {
  ensureReady();
  const statement = sqlDb.prepare(query);

  try {
    if (params.length) {
      statement.bind(params);
    }

    const rows = [];
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }

    return rows;
  } finally {
    statement.free();
  }
}

function initializeSchema() {
  db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  allow_veto INTEGER NOT NULL DEFAULT 1,
  visibility TEXT NOT NULL DEFAULT 'personal',
  invite_code TEXT,
  allow_member_add INTEGER NOT NULL DEFAULT 1,
  allow_member_veto INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name, created_by),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  genres TEXT NOT NULL DEFAULT '',
  poster_url TEXT,
  overview TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS list_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(list_id, user_id),
  FOREIGN KEY (list_id) REFERENCES lists(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS list_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL,
  movie_id INTEGER NOT NULL,
  added_by INTEGER NOT NULL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(list_id, movie_id),
  FOREIGN KEY (list_id) REFERENCES lists(id),
  FOREIGN KEY (movie_id) REFERENCES movies(id),
  FOREIGN KEY (added_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS movie_vetoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  movie_id INTEGER NOT NULL,
  list_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, movie_id, list_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (movie_id) REFERENCES movies(id),
  FOREIGN KEY (list_id) REFERENCES lists(id)
);

CREATE TABLE IF NOT EXISTS genre_vetoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  list_id INTEGER NOT NULL,
  genre TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, list_id, genre),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (list_id) REFERENCES lists(id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  movie_id INTEGER NOT NULL,
  rating REAL NOT NULL,
  watched_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, movie_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (movie_id) REFERENCES movies(id)
);

CREATE TABLE IF NOT EXISTS action_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

  // Lightweight migrations for existing SQLite files.
  ensureColumn('lists', 'description', "description TEXT NOT NULL DEFAULT ''");
  ensureColumn('lists', 'cover_url', 'cover_url TEXT');
  ensureColumn('lists', 'is_public', 'is_public INTEGER NOT NULL DEFAULT 0');
  ensureColumn('lists', 'allow_veto', 'allow_veto INTEGER NOT NULL DEFAULT 1');
  ensureColumn('lists', 'visibility', "visibility TEXT NOT NULL DEFAULT 'personal'");
  ensureColumn('lists', 'invite_code', 'invite_code TEXT');
  ensureColumn('lists', 'allow_member_add', 'allow_member_add INTEGER NOT NULL DEFAULT 1');
  ensureColumn('lists', 'allow_member_veto', 'allow_member_veto INTEGER NOT NULL DEFAULT 1');

  run(
    `
    UPDATE lists
    SET visibility = CASE
      WHEN is_public = 1 THEN 'public'
      ELSE 'personal'
    END
    WHERE visibility IS NULL OR visibility = ''
    `
  );
}

// Lightweight migrations for existing SQLite files.
function ensureColumn(tableName, columnName, ddl) {
  const columns = all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${ddl}`);
  }
}

function run(query, params = []) {
  const result = executeRun(query, params);
  schedulePersist();
  return result;
}

function get(query, params = []) {
  return executeGet(query, params);
}

function all(query, params = []) {
  return executeAll(query, params);
}

function logAction(action, payload = {}, userId = null) {
  return run(
    `INSERT INTO action_logs (user_id, action, payload) VALUES (?, ?, ?)`,
    [userId, action, JSON.stringify(payload)]
  );
}

module.exports = {
  db,
  initDb,
  run,
  get,
  all,
  logAction,
};
