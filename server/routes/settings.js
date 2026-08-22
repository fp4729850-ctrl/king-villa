const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminAuth } = require('./auth');

router.get('/', async (req, res) => {
  try {
    let settingsRes = await db.query('SELECT * FROM sitesettings LIMIT 1');
    if (settingsRes.rows.length === 0) {
      await db.query(
        'INSERT INTO sitesettings ("qrCode", "upiId", "contactEmail", "contactPhone") VALUES ($1, $2, $3, $4)',
        ['', 'kingvilla@upi', 'hello@kingvilla.com', '+91 9876543210']
      );
      settingsRes = await db.query('SELECT * FROM sitesettings LIMIT 1');
    }
    res.json(settingsRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', adminAuth, async (req, res) => {
  const { qrCode, upiId, contactEmail, contactPhone } = req.body;
  try {
    await db.query(
      'UPDATE sitesettings SET "qrCode" = $1, "upiId" = $2, "contactEmail" = $3, "contactPhone" = $4 WHERE id = (SELECT id FROM sitesettings LIMIT 1)',
      [qrCode, upiId, contactEmail, contactPhone]
    );
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
