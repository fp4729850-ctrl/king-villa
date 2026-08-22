const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminAuth } = require('./auth');

router.get('/', (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM siteSettings LIMIT 1').get();
    if (!settings) {
      const insert = db.prepare('INSERT INTO siteSettings (qrCode, upiId, contactEmail, contactPhone) VALUES (?, ?, ?, ?)');
      insert.run('', 'kingvilla@upi', 'hello@kingvilla.com', '+91 9876543210');
      settings = db.prepare('SELECT * FROM siteSettings LIMIT 1').get();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', adminAuth, (req, res) => {
  const { qrCode, upiId, contactEmail, contactPhone } = req.body;
  try {
    const update = db.prepare('UPDATE siteSettings SET qrCode = ?, upiId = ?, contactEmail = ?, contactPhone = ? WHERE id = (SELECT id FROM siteSettings LIMIT 1)');
    update.run(qrCode, upiId, contactEmail, contactPhone);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
