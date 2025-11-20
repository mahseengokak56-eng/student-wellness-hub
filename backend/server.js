// ✅ Import modules
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const bcrypt = require('bcrypt');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const db = require('./db'); // the file we created above
 
const app = express();
const PORT = process.env.PORT || 5000;


// ======= TEMP DEBUG HELPERS - paste right after your require(...) lines =======
app.use((req, res, next) => {
  console.log(`[REQ] ${new Date().toISOString()} ${req.method} ${req.originalUrl} origin=${req.headers.origin || ''}`);
  next();
});

// lightweight error logger so any thrown error prints with detail
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (r) => {
  console.error('[unhandledRejection]', r);
});

// test route to check server connectivity quickly
app.get('/ping', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
// ======================================================================

// ===== dev-friendly CORS + JSON + session (replace previous cors / bodyParser / session) =====
app.use(cors({
  origin: (origin, cb) => cb(null, true), // dev: allow all origins. In prod change to your origin.
  credentials: true,
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './' }),
  secret: 'replace_this_with_a_strong_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000, sameSite: 'lax' }
}));


// ========== Logging helper ==========
function insertLog({ event_type, category = null, message = null, user = null, data = null, req = null }) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    const ua = req ? req.headers['user-agent'] : null;
    const stmt = db.prepare(
      `INSERT INTO logs (event_type, category, message, user, data, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      event_type,
      category,
      message,
      user,
      data ? JSON.stringify(data) : null,
      ip,
      ua,
      function (err) {
        if (err) console.error("insertLog DB error:", err);
      }
    );
    stmt.finalize();
  } catch (err) {
    console.error("insertLog error:", err);
  }
}

// ✅ Load JSON files
const quotes = JSON.parse(fs.readFileSync("./quotes.json", "utf8"));
const resources = JSON.parse(fs.readFileSync("./resources.json", "utf8"));

// ✅ Middleware
// ---------- Middleware (CORS, JSON, Session) ----------
const EXPRESS_ORIGIN = "http://localhost:5000"; // change if you serve frontend from different port

// -------- PROTECT ROUTES MIDDLEWARE --------
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next(); // user is logged in
  }
  return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
}


// ✅ Base route
app.get("/", (req, res) => {
  res.send("🚀 Student Wellness Hub Backend is running...");
});

// ----- Robust login endpoint (replace any existing /login) -----
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    console.log('[login] body:', { username: username ? username : null });

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // find user
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('[login] DB error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
      if (!user) {
        console.log('[login] user not found:', username);
        // log failure if you use insertLog
        if (typeof insertLog === 'function') insertLog({ event_type:'login_failed', category:'auth', message:'user not found', user: username, req });
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // compare password
      try {
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          console.log('[login] wrong password for', username);
          if (typeof insertLog === 'function') insertLog({ event_type:'login_failed', category:'auth', message:'wrong password', user: username, req });
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // success: create session
        if (req.session) {
          req.session.userId = user.id;
          req.session.username = user.username;
        }

        if (typeof insertLog === 'function') insertLog({ event_type:'login_success', category:'auth', message:'login success', user: username, req });
        console.log('[login] success:', username);
        return res.json({ success: true, message: `Welcome ${user.username}` });
      } catch (cmpErr) {
        console.error('[login] bcrypt compare error:', cmpErr);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
    });
  } catch (err) {
    console.error('[login] exception:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ✅ Quotes route
app.get("/quotes/:category", (req, res) => {
  const category = req.params.category.toLowerCase();
  if (quotes[category]) {
    res.json(quotes[category]);
  } else {
    res.status(404).json({ message: "Category not found" });
  }
});

// ✅ Resources route
app.get("/resources/:category", (req, res) => {
  const category = req.params.category.toLowerCase();
  if (resources[category]) {
    res.json(resources[category]);
  } else {
    res.status(404).json({ message: "Category not found" });
  }
});

app.get("/profile", requireAuth, (req, res) => {
  res.json({ success: true, user: req.session.username });
});


// 🌍 Global Search Route
app.get("/search", (req, res) => {
  const query = req.query.q?.toLowerCase() || "";
  if (!query) return res.json({ results: [] });

  const results = [];

  // Load resources file
  const resources = JSON.parse(fs.readFileSync("./resources.json", "utf8"));

  // 🔹 Search in quotes
  for (const [category, items] of Object.entries(quotes)) {
    const match = items.filter(q => q.toLowerCase().includes(query));
    if (match.length) results.push({ type: "Quote", category, data: match });
  }

  // 🔹 Search in resources
  for (const [category, items] of Object.entries(resources)) {
    if (category === "mindfulness" || category === "healthcare") {
      const match = items.filter(i =>
        Object.values(i).some(v => v.toString().toLowerCase().includes(query))
      );
      if (match.length) results.push({ type: category, category, data: match });
    } else {
      const match = items.filter(phase =>
        phase.phase.toLowerCase().includes(query) ||
        phase.steps.some(s => s.toLowerCase().includes(query))
      );
      if (match.length) results.push({ type: category, category, data: match });
    }
  }

  res.json({ results });
});

// Helper: get user by username
function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}


// add to server.js (temporary)
app.post('/create-user', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ success:false, message: "username+password required" });
  // reuse hashing logic used in /register
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  db.run(`INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
    [username, email || null, hash],
    function(err) {
      if (err) return res.status(500).json({ success:false, message: "DB error" });
      res.json({ success:true, message: "User created", userId: this.lastID });
    });
});

// optional unprotected quick users list (for local dev)
app.get('/users', (req, res) => {
  db.all("SELECT id, username, email, created_at FROM users ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// REGISTER endpoint (with debug logs)
app.post('/register', async (req, res) => {
  console.log('[register] incoming body:', req.body);
  try {
    const { username, password, email } = req.body || {};

    if (!username || !password) {
      console.warn('[register] missing username or password');
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // check if username exists
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
      if (err) {
        console.error('[register] DB error checking username:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
      if (row) {
        console.log('[register] username exists:', username);
        return res.status(409).json({ success: false, message: 'Username already taken' });
      }

      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);

      db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email || null, hash], function (err) {
        if (err) {
          console.error('[register] DB insert user error:', err);
          return res.status(500).json({ success: false, message: 'Server error' });
        }

        // auto-login after registration:
        if (req.session) {
          req.session.userId = this.lastID;
          req.session.username = username;
        }

        if (typeof insertLog === 'function') {
          insertLog({ event_type: 'register', category: 'auth', message: `User registered: ${username}`, user: username, req });
        }

        console.log('[register] user created id=', this.lastID);
        res.json({ success: true, message: 'Registration successful', userId: this.lastID });
      });
    });
  } catch (err) {
    console.error('[register] Exception:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Start only one server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
