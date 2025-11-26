const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const session = require("express-session");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Session config: secure:false for localhost, sameSite:lax so fetch sends cookie
app.use(session({
  secret: "todo-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  }
}));

// DB setup (file: tasks.db in project root)
const db = new sqlite3.Database(path.join(__dirname, "tasks.db"), err => {
  if (err) console.error("DB open error:", err);
});

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      task TEXT,
      status TEXT DEFAULT 'todo'
    )
  `);
});

// Helper: requireLogin that returns JSON for API calls and redirect for page loads
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();

  // If request expects JSON (API call), return 401 JSON
  const accepts = req.headers.accept || "";
  if (accepts.includes("application/json") || req.path.startsWith("/tasks")) {
    return res.status(401).json({ success: false, error: "Not logged in" });
  }

  // Otherwise redirect to login page
  return res.redirect("/login.html");
}

// ---------- AUTH ROUTES ----------

// Register
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: "Missing" });

  db.run(
    `INSERT INTO users (username, password) VALUES (?, ?)`,
    [username, password],
    function (err) {
      if (err) return res.json({ success: false, error: "Username already exists" });
      res.json({ success: true });
    }
  );
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    `SELECT id, username FROM users WHERE username = ? AND password = ?`,
    [username, password],
    (err, user) => {
      if (err || !user) return res.json({ success: false, error: "Invalid credentials" });

      // store minimal user info in session (avoid storing password)
      req.session.user = { id: user.id, username: user.username };
      res.json({ success: true });
    }
  );
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    // ignore err; send JSON success
    res.json({ success: true });
  });
});

// ---------- TASK ROUTES (protected) ----------

// Get tasks
app.get("/tasks", requireLogin, (req, res) => {
  db.all(`SELECT id, task, status FROM tasks WHERE user_id = ?`, [req.session.user.id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: "DB error" });
    res.json(rows || []);
  });
});

// Add task
app.post("/tasks", requireLogin, (req, res) => {
  const { task, status } = req.body;
  if (!task) return res.json({ success: false, error: "Task required" });

  const safeStatus = (typeof status === "string" && status.length) ? status : "todo";

  db.run(
    `INSERT INTO tasks (user_id, task, status) VALUES (?, ?, ?)`,
    [req.session.user.id, task, safeStatus],
    function (err) {
      if (err) {
        console.error("Insert task error:", err);
        return res.json({ success: false, error: "DB insert failed" });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Update task (status)
app.put("/tasks/:id", requireLogin, (req, res) => {
  const { status } = req.body;
  db.run(
    `UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?`,
    [status, req.params.id, req.session.user.id],
    function (err) {
      if (err) {
        console.error("Update task error:", err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

// Delete task
app.delete("/tasks/:id", requireLogin, (req, res) => {
  db.run(
    `DELETE FROM tasks WHERE id = ? AND user_id = ?`,
    [req.params.id, req.session.user.id],
    function (err) {
      if (err) {
        console.error("Delete task error:", err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

// ---------- HTML routes ----------

// serve login by default
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));

// protected profile route (serves static profile.html but only when logged in)
app.get("/profile", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

// register page
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
