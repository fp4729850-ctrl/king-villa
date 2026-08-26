const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminAuth } = require('./auth');

// Create booking
router.post('/', auth, async (req, res) => {
  const { roomId, checkIn, checkOut, guestDetails, amount, aadharCards } = req.body;
  const userId = req.user.id;
  const refCode = 'KV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    // Check if the requested room is Entire Villa
    const roomRes = await db.query('SELECT "isEntireVilla" FROM rooms WHERE id = $1', [roomId]);
    const isEntireVilla = roomRes.rows[0]?.isEntireVilla;

    let overlapQuery;
    let queryParams;
    
    if (isEntireVilla) {
       // Conflicts with ANY room booking for these dates
       overlapQuery = `
         SELECT id FROM bookings
         WHERE status IN ('paid', 'confirmed', 'cancel_request')
         AND ("checkIn" < $1 AND "checkOut" > $2)
       `;
       queryParams = [checkOut, checkIn];
    } else {
       // Conflicts with THIS room OR the Entire Villa
       overlapQuery = `
         SELECT b.id FROM bookings b
         JOIN rooms r ON b."roomId" = r.id
         WHERE (b."roomId" = $1 OR r."isEntireVilla" = true)
         AND b.status IN ('paid', 'confirmed', 'cancel_request')
         AND (b."checkIn" < $2 AND b."checkOut" > $3)
       `;
       queryParams = [roomId, checkOut, checkIn];
    }

    const overlapRes = await db.query(overlapQuery, queryParams);
    
    if (overlapRes.rows.length > 0) {
      return res.status(400).json({ error: 'Room is already booked for these dates' });
    }

    const insertRes = await db.query(
      'INSERT INTO bookings ("userId", "roomId", "checkIn", "checkOut", "guestDetails", amount, "refCode", "aadharCards") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [userId, roomId, checkIn, checkOut, JSON.stringify(guestDetails), amount, refCode, JSON.stringify(aadharCards || [])]
    );
    
    res.status(201).json({ message: 'Booking created', bookingId: insertRes.rows[0].id, refCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get booked dates for a room
router.get('/room/:roomId/dates', async (req, res) => {
  try {
    const roomRes = await db.query('SELECT "isEntireVilla" FROM rooms WHERE id = $1', [req.params.roomId]);
    const isEntireVilla = roomRes.rows[0]?.isEntireVilla;
    
    let query;
    let params;
    if (isEntireVilla) {
      query = `SELECT "checkIn", "checkOut" FROM bookings WHERE status IN ('paid', 'confirmed', 'cancel_request')`;
      params = [];
    } else {
      query = `
        SELECT b."checkIn", b."checkOut" 
        FROM bookings b
        JOIN rooms r ON b."roomId" = r.id
        WHERE (b."roomId" = $1 OR r."isEntireVilla" = true) 
        AND b.status IN ('paid', 'confirmed', 'cancel_request')
      `;
      params = [req.params.roomId];
    }

    const bookingsRes = await db.query(query, params);
    res.json(bookingsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload payment proof
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { paymentProof } = req.body;
    if (!paymentProof) return res.status(400).json({ error: 'No file provided' });
    
    const updateRes = await db.query(
      'UPDATE bookings SET "paymentProof" = $1, status = $2 WHERE id = $3 AND "userId" = $4 RETURNING "refCode"',
      [paymentProof, 'paid', req.params.id, req.user.id]
    );
    
    if (updateRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    
    res.json({ message: 'Payment proof uploaded', refCode: updateRes.rows[0].refCode });
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

// Cancel booking request (User)
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason is required' });
    
    // Get existing booking to update guestDetails JSON
    const bookingRes = await db.query('SELECT * FROM bookings WHERE id = $1 AND "userId" = $2', [req.params.id, req.user.id]);
    if (bookingRes.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    
    const booking = bookingRes.rows[0];
    const guestDetails = JSON.parse(booking.guestDetails || '{}');
    guestDetails.cancelReason = reason;
    
    await db.query(
      'UPDATE bookings SET status = $1, "guestDetails" = $2 WHERE id = $3 AND "userId" = $4',
      ['cancel_request', JSON.stringify(guestDetails), req.params.id, req.user.id]
    );
    
    res.json({ message: 'Cancellation request submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: get all bookings
router.get('/', adminAuth, async (req, res) => {
  try {
    const bookingsRes = await db.query(`
      SELECT b.*, r.name as "roomName", u.name as "userName", u.email as "userEmail", u.mobile as "userMobile"
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

// Admin: Direct booking for walk-in customers
router.post('/admin-direct', adminAuth, async (req, res) => {
  const { roomId, checkIn, checkOut, guestName, guestPhone, guestCount, amount, paymentType, aadharCards } = req.body;
  const refCode = 'WI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    // Check if the requested room is Entire Villa
    const roomRes = await db.query('SELECT "isEntireVilla" FROM rooms WHERE id = $1', [roomId]);
    const isEntireVilla = roomRes.rows[0]?.isEntireVilla;

    let overlapQuery;
    let queryParams;
    
    if (isEntireVilla) {
       overlapQuery = `
         SELECT id FROM bookings
         WHERE status IN ('paid', 'confirmed', 'cancel_request', 'external')
         AND ("checkIn" < $1 AND "checkOut" > $2)
       `;
       queryParams = [checkOut, checkIn];
    } else {
       overlapQuery = `
         SELECT b.id FROM bookings b
         JOIN rooms r ON b."roomId" = r.id
         WHERE (b."roomId" = $1 OR r."isEntireVilla" = true)
         AND b.status IN ('paid', 'confirmed', 'cancel_request', 'external')
         AND (b."checkIn" < $2 AND b."checkOut" > $3)
       `;
       queryParams = [roomId, checkOut, checkIn];
    }

    const overlapRes = await db.query(overlapQuery, queryParams);
    
    if (overlapRes.rows.length > 0) {
      return res.status(400).json({ error: 'Room is already booked for these dates' });
    }

    const guestDetails = {
      name: guestName,
      phone: guestPhone,
      count: guestCount,
      paymentType: paymentType,
      totalAmount: amount,
      advancePaid: amount,
      balanceAmount: 0,
      source: 'Walk-in (Admin)'
    };

    const insertRes = await db.query(
      'INSERT INTO bookings ("userId", "roomId", "checkIn", "checkOut", "guestDetails", amount, "refCode", status, "aadharCards") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [1, roomId, checkIn, checkOut, JSON.stringify(guestDetails), amount, refCode, 'confirmed', JSON.stringify(aadharCards || [])]
    );
    
    res.status(201).json({ message: 'Walk-in booking created', bookingId: insertRes.rows[0].id, refCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
