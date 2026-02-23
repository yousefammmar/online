const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth, requireAdmin } = require('../middleware');

// Create Booking
router.post('/', requireAuth, (req, res) => {
    const { slot_id } = req.body;
    const user_id = req.user.userId;

    if (!slot_id) return res.status(400).json({ error: 'slot_id is required' });

    try {
        const slot = db.prepare('SELECT * FROM slots WHERE id = ?').get(slot_id);
        if (!slot) return res.status(404).json({ error: 'Slot not found' });
        if (slot.available_count <= 0) return res.status(409).json({ error: 'Slot is fully booked' });

        // Prevent double booking for the same user and slot
        const existingBooking = db.prepare('SELECT * FROM bookings WHERE user_id = ? AND slot_id = ?').get(user_id, slot_id);
        if (existingBooking) return res.status(409).json({ error: 'You have already booked this slot' });

        // Transaction
        const transaction = db.transaction(() => {
            // Decrement capacity
            db.prepare('UPDATE slots SET available_count = available_count - 1 WHERE id = ?').run(slot_id);

            // Create booking
            const info = db.prepare('INSERT INTO bookings (user_id, service_id, slot_id) VALUES (?, ?, ?)')
                .run(user_id, slot.service_id, slot_id);

            return info.lastInsertRowid;
        });

        const booking_id = transaction();
        res.status(201).json({ message: 'Booking created successfully', booking_id });

    } catch (err) {
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// View My Bookings
router.get('/', requireAuth, (req, res) => {
    const user_id = req.user.userId;
    const now = new Date().toISOString();
    try {
        const query = `
      SELECT b.id, b.status, b.created_at, srv.name as service_name, sl.start_datetime 
      FROM bookings b
      JOIN services srv ON b.service_id = srv.id
      JOIN slots sl ON b.slot_id = sl.id
      WHERE b.user_id = ? AND sl.start_datetime > ?
      ORDER BY sl.start_datetime
    `;
        const bookings = db.prepare(query).all(user_id, now);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Cancel Booking
router.delete('/:id', requireAuth, (req, res) => {
    const booking_id = req.params.id;
    const user_id = req.user.userId;

    try {
        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // Only the owner or an admin can cancel
        if (booking.user_id !== user_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to cancel this booking' });
        }

        const transaction = db.transaction(() => {
            // Increment capacity
            db.prepare('UPDATE slots SET available_count = available_count + 1 WHERE id = ?').run(booking.slot_id);
            // Delete booking
            db.prepare('DELETE FROM bookings WHERE id = ?').run(booking_id);
        });

        transaction();
        res.json({ message: 'Booking cancelled successfully' });

    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// Admin View All Bookings
router.get('/admin', requireAuth, requireAdmin, (req, res) => {
    const now = new Date().toISOString();
    try {
        const query = `
      SELECT b.id, b.status, b.created_at, u.full_name, u.email, srv.name as service_name, sl.start_datetime 
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN services srv ON b.service_id = srv.id
      JOIN slots sl ON b.slot_id = sl.id
      WHERE sl.start_datetime > ?
      ORDER BY sl.start_datetime
    `;
        const bookings = db.prepare(query).all(now);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch all bookings' });
    }
});

module.exports = router;
