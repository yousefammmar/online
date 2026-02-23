const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAuth, JWT_SECRET } = require('../middleware');

// Config
const COOKIE_OPT = {
    httpOnly: true,
    secure: false, // set to true in production with HTTPS
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
};

// Register User
router.post('/register', async (req, res) => {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const insert = db.prepare('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)');
        const info = insert.run(full_name, email, hash);

        const token = jwt.sign({ userId: info.lastInsertRowid, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, COOKIE_OPT);
        res.status(201).json({ message: 'Registration successful.', user: { id: info.lastInsertRowid, full_name, email, role: 'user' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Register Admin (Custom for Huawei req)
router.post('/register-admin', async (req, res) => {
    const { full_name, email, password, admin_code } = req.body;

    // In a real app, this code would be stored in .env
    const SECRET_ADMIN_CODE = 'HUAWEI_ADMIN_2026';

    if (!full_name || !email || !password || !admin_code) {
        return res.status(400).json({ error: 'All fields including Admin Code are required.' });
    }

    if (admin_code !== SECRET_ADMIN_CODE) {
        return res.status(403).json({ error: 'Invalid admin registration code.' });
    }

    try {
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const insert = db.prepare('INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)');
        const info = insert.run(full_name, email, hash, 'admin');

        const token = jwt.sign({ userId: info.lastInsertRowid, email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, COOKIE_OPT);
        res.status(201).json({ message: 'Admin Registration successful.', user: { id: info.lastInsertRowid, full_name, email, role: 'admin' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, COOKIE_OPT);
        res.json({ message: 'Login successful.', user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Get Current Logged In User
router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, full_name, email, role FROM users WHERE id = ?').get(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
