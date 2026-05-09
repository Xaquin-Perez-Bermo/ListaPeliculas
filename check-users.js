const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data.sqlite');
const db = new Database(dbPath);

const users = db.prepare('SELECT id, username FROM users').all();
console.log('Usuarios en la base de datos:', users);

db.close();