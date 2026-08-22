const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminAuth } = require('./auth');

router.get('/', (req, res) => {
  try {
    const rooms = db.prepare('SELECT * FROM rooms').all();
    rooms.forEach(r => {
      r.amenities = JSON.parse(r.amenities || '[]');
      r.images = JSON.parse(r.images || '[]');
    });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    room.amenities = JSON.parse(room.amenities || '[]');
    room.images = JSON.parse(room.images || '[]');
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', adminAuth, (req, res) => {
  const { name, description, price, capacity, amenities, images } = req.body;
  try {
    const update = db.prepare('UPDATE rooms SET name = ?, description = ?, price = ?, capacity = ?, amenities = ?, images = ? WHERE id = ?');
    update.run(
      name, 
      description, 
      price, 
      capacity, 
      JSON.stringify(amenities), 
      JSON.stringify(images), 
      req.params.id
    );
    res.json({ message: 'Room updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
