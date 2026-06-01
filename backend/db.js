const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./expense.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, email TEXT UNIQUE, password TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, type TEXT, amount REAL,
    category TEXT, description TEXT, date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});
module.exports = db;
