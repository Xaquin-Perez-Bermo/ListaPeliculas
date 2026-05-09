const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

async function createUser() {
  const dbPath = path.join(__dirname, 'server', 'data.sqlite');
  const db = new Database(dbPath);

  const username = 'admin';
  const password = '1234';
  const hash = await bcrypt.hash(password, 10);

  try {
    const insert = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log('Usuario creado exitosamente:', { id: insert.lastInsertRowid, username });
  } catch (error) {
    console.log('Error:', error.message);
  }

  db.close();
}

createUser();