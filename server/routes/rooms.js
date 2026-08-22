const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminAuth } = require('./auth');

router.get('/', async (req, res) => {
  try {
    const roomsRes = await db.query('SELECT * FROM rooms');
    const rooms = roomsRes.rows;
    rooms.forEach(r => {
      r.amenities = JSON.parse(r.amenities || '[]');
      r.images = JSON.parse(r.images || '[]');
    });
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
