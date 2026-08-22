const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminAuth } = require('./auth');

router.get('/', async (req, res) => {
  try {
    const roomsRes = await db.query('SELECT * FROM rooms ORDER BY id ASC');
    const rooms = roomsRes.rows;
    
    const today = new Date().toISOString().split('T')[0];

    for (let room of rooms) {
      room.amenities = JSON.parse(room.amenities || '[]');
      room.images = JSON.parse(room.images || '[]');
      
      let overlapRes;
      if (room.isEntireVilla) {
        overlapRes = await db.query(`
          SELECT id FROM bookings
          WHERE status IN ('paid', 'confirmed', 'cancel_request')
          AND ("checkIn" <= $1 AND "checkOut" > $1)
        `, [today]);
      } else {
        overlapRes = await db.query(`
          SELECT b.id FROM bookings b
          JOIN rooms r ON b."roomId" = r.id
          WHERE (b."roomId" = $1 OR r."isEntireVilla" = true)
          AND b.status IN ('paid', 'confirmed', 'cancel_request')
          AND (b."checkIn" <= $2 AND b."checkOut" > $2)
        `, [room.id, today]);
      }
      
      room.isBookedToday = overlapRes.rows.length > 0;
    }
    
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const roomRes = await db.query('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
    if (roomRes.rows.length === 0) return res.status(404).json({ error: 'Room not found' });
    
    const room = roomRes.rows[0];
    room.amenities = JSON.parse(room.amenities || '[]');
    room.images = JSON.parse(room.images || '[]');
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  const { name, description, price, capacity, amenities, images } = req.body;
  try {
    await db.query(
      'UPDATE rooms SET name = $1, description = $2, price = $3, capacity = $4, amenities = $5, images = $6 WHERE id = $7',
      [name, description, price, capacity, JSON.stringify(amenities), JSON.stringify(images), req.params.id]
    );
    res.json({ message: 'Room updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
