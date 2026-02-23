const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth, requireAdmin } = require('../middleware');

// List Services
router.get('/', (req, res) => {
    try {
        const services = db.prepare('SELECT * FROM services').all();
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch services.' });
    }
});

// Admin Add Service
router.post('/admin', requireAuth, requireAdmin, (req, res) => {
    const { name, description, duration_minutes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const insert = db.prepare('INSERT INTO services (name, description, duration_minutes) VALUES (?, ?, ?)');
        const info = insert.run(name, description || '', duration_minutes || 30);
        res.status(201).json({ message: 'Service created', service_id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create service' });
    }
});

// Admin Delete Service
router.delete('/admin/:id', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM services WHERE id = ?').run(id);
        res.json({ message: 'Service deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

module.exports = router;
