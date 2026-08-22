const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminAuth } = require('./auth');

// Create booking
router.post('/', auth, async (req, res) => {
  const { roomId, checkIn, checkOut, guestDetails, amount } = req.body;
  const userId = req.user.id;
  const refCode = 'KV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    const insertRes = await db.query(
      'INSERT INTO bookings ("userId", "roomId", "checkIn", "checkOut", "guestDetails", amount, "refCode") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [userId, roomId, checkIn, checkOut, JSON.stringify(guestDetails), amount, refCode]
    );
    
    res.status(201).json({ message: 'Booking created', bookingId: insertRes.rows[0].id, refCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload payment proof
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { paymentProof } = req.body;
    if (!paymentProof) return res.status(400).json({ error: 'No file provided' });
    
    await db.query(
      'UPDATE bookings SET "paymentProof" = $1, status = $2 WHERE id = $3 AND "userId" = $4',
      [paymentProof, 'paid', req.params.id, req.user.id]
    );
    
    res.json({ message: 'Payment proof uploaded', paymentProof: 'uploaded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user bookings
router.get('/my', auth, async (req, res) => {
  try {
    const bookingsRes = await db.query(`
      SELECT b.*, r.name as "roomName" 
      FROM bookings b 
      JOIN rooms r ON b."roomId" = r.id 
      WHERE b."userId" = $1
      ORDER BY b.id DESC
    `, [req.user.id]);
    
    const bookings = bookingsRes.rows;
    bookings.forEach(b => b.guestDetails = JSON.parse(b.guestDetails || '{}'));
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get all bookings
router.get('/', adminAuth, async (req, res) => {
  try {
    const bookingsRes = await db.query(`
      SELECT b.*, r.name as "roomName", u.name as "userName", u.email as "userEmail"
      FROM bookings b 
      JOIN rooms r ON b."roomId" = r.id 
      JOIN users u ON b."userId" = u.id
      ORDER BY b.id DESC
    `);
    
    const bookings = bookingsRes.rows;
    bookings.forEach(b => b.guestDetails = JSON.parse(b.guestDetails || '{}'));
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update status
router.put('/:id/status', adminAuth, async (req, res) => {
  const { status } = req.body;
  try {
    await db.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get by ref (for receipt)
router.get('/ref/:refCode', auth, async (req, res) => {
  try {
    const bookingRes = await db.query(`
      SELECT b.*, r.name as "roomName", r.price, u.name as "userName" 
      FROM bookings b 
      JOIN rooms r ON b."roomId" = r.id 
      JOIN users u ON b."userId" = u.id
      WHERE b."refCode" = $1
    `, [req.params.refCode]);
    
    if (bookingRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    
    const booking = bookingRes.rows[0];
    
    // Check ownership unless admin
    if (booking.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    booking.guestDetails = JSON.parse(booking.guestDetails || '{}');
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
