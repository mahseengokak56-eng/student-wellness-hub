// backend/show_users.js
const db = require('./db');

db.all("SELECT id, username, email, created_at FROM users ORDER BY id DESC", [], (err, rows) => {
  if (err) {
    console.error('DB error:', err);
    process.exit(1);
  }
  console.log('USERS:');
  console.table(rows);
  process.exit(0);
});
