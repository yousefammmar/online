const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth, requireAdmin } = require('../middleware');

// List Available Slots (Optionally filter by service)
router.get('/', (req, res) => {
    const service_id = req.query.service_id;
    try {
        let slots;
        if (service_id) {
            slots = db.prepare('SELECT * FROM slots WHERE service_id = ? AND available_count > 0 ORDER BY start_datetime').all(service_id);
        } else {
            slots = db.prepare('SELECT * FROM slots WHERE available_count > 0 ORDER BY start_datetime').all();
        }
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch slots' });
    }
});

// Admin Add Slot
router.post('/admin', requireAuth, requireAdmin, (req, res) => {
    const { service_id, start_datetime, capacity } = req.body;
    if (!service_id || !start_datetime) {
        return res.status(400).json({ error: 'service_id and start_datetime are required' });
    }

    const slotCapacity = capacity || 1;

    try {
        const insert = db.prepare('INSERT INTO slots (service_id, start_datetime, capacity, available_count) VALUES (?, ?, ?, ?)');
        const info = insert.run(service_id, start_datetime, slotCapacity, slotCapacity);
        res.status(201).json({ message: 'Slot created', slot_id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create slot' });
    }
});

// Admin Update Slot
router.put('/admin/:id', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { start_datetime, capacity } = req.body;

    try {
        const slot = db.prepare('SELECT * FROM slots WHERE id = ?').get(id);
        if (!slot) return res.status(404).json({ error: 'Slot not found' });

        // Calculate new available_count based on capacity change
        const capacityDiff = (capacity || slot.capacity) - slot.capacity;
        const newAvailableCount = slot.available_count + capacityDiff;

        db.prepare('UPDATE slots SET start_datetime = ?, capacity = ?, available_count = ? WHERE id = ?')
            .run(start_datetime || slot.start_datetime, capacity || slot.capacity, newAvailableCount, id);

        res.json({ message: 'Slot updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update slot' });
    }
});

// Admin Delete Slot
router.delete('/admin/:id', requireAuth, requireAdmin, (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM slots WHERE id = ?').run(id);
        res.json({ message: 'Slot deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete slot' });
    }
});

module.exports = router;
