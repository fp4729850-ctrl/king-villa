const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { auth, adminAuth } = require('./auth');

// Multer setup for payment screenshots
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

// Create booking
router.post('/', auth, (req, res) => {
  const { roomId, checkIn, checkOut, guestDetails, amount } = req.body;
  const userId = req.user.id;
  const refCode = 'KV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    const insert = db.prepare('INSERT INTO bookings (userId, roomId, checkIn, checkOut, guestDetails, amount, refCode) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const result = insert.run(userId, roomId, checkIn, checkOut, JSON.stringify(guestDetails), amount, refCode);
    
    res.status(201).json({ message: 'Booking created', bookingId: result.lastInsertRowid, refCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload payment proof
router.post('/:id/payment', auth, upload.single('paymentProof'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const filePath = '/uploads/' + req.file.filename;
    const update = db.prepare('UPDATE bookings SET paymentProof = ?, status = ? WHERE id = ? AND userId = ?');
    update.run(filePath, 'paid', req.params.id, req.user.id);
    
    res.json({ message: 'Payment proof uploaded', paymentProof: filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user bookings
router.get('/my', auth, (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT b.*, r.name as roomName 
      FROM bookings b 
      JOIN rooms r ON b.roomId = r.id 
      WHERE b.userId = ?
      ORDER BY b.id DESC
    `).all(req.user.id);
    
    bookings.forEach(b => b.guestDetails = JSON.parse(b.guestDetails || '{}'));
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get all bookings
router.get('/', adminAuth, (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT b.*, r.name as roomName, u.name as userName, u.email as userEmail
      FROM bookings b 
      JOIN rooms r ON b.roomId = r.id 
      JOIN users u ON b.userId = u.id
      ORDER BY b.id DESC
    `).all();
    
    bookings.forEach(b => b.guestDetails = JSON.parse(b.guestDetails || '{}'));
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update status
router.put('/:id/status', adminAuth, (req, res) => {
  const { status } = req.body;
  try {
    const update = db.prepare('UPDATE bookings SET status = ? WHERE id = ?');
    update.run(status, req.params.id);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get by ref (for receipt)
router.get('/ref/:refCode', auth, (req, res) => {
  try {
    const booking = db.prepare(`
      SELECT b.*, r.name as roomName, r.price, u.name as userName 
      FROM bookings b 
      JOIN rooms r ON b.roomId = r.id 
      JOIN users u ON b.userId = u.id
      WHERE b.refCode = ?
    `).get(req.params.refCode);
    
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
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
