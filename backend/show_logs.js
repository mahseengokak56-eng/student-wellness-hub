// backend/show_logs.js
const db = require('./db');

db.all("SELECT id, event_type, message, user, created_at FROM logs ORDER BY created_at DESC LIMIT 200", [], (err, rows) => {
  if (err) {
    console.error('DB error:', err);
    process.exit(1);
  }
  console.log('LOGS:');
  console.table(rows);
  process.exit(0);
});
