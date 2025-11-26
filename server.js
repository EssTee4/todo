const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./database');
const app = express();

// ---- Body Parsers ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Sessions ----
app.use(session({
    secret: "123secretkey!",
    resave: false,
    saveUninitialized: false,
}));

// ---- Serve static files ----
app.use(express.static('public'));

// ---- Redirect root to login ----
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// ---- Protect profile page ----
app.get('/profile.html', (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login.html');
    next();
});

// ---- LOGIN ----
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username=?", [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.json({ error: "Invalid credentials" });
        }
        req.session.userId = user.id;
        res.json({ success: true });
    });
});

// ---- TASKS API ----
app.get('/tasks', (req, res) => {
    db.all("SELECT * FROM tasks WHERE user_id = ?", [req.session.userId], (err, tasks) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(tasks);
    });
});

app.post('/tasks', (req, res) => {
    const { task, status } = req.body;
    const userId = req.session.userId;
    db.run("INSERT INTO tasks (task, status, user_id) VALUES (?, ?, ?)", [task, status, userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, task, status });
    });
});

app.put('/tasks/:id', (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    db.run("UPDATE tasks SET status = ? WHERE id = ?", [status, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/tasks/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM tasks WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});



// ---- LOGOUT ----
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// ---- Server ----
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
