require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import Routes
const authRoutes = require('./routes/auth').router;
const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');
const settingsRouter = require('./routes/settings');
const icalRouter = require('./routes/ical');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ical', icalRouter);

const { adminAuth } = require('./routes/auth');

app.post('/api/visits', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await db.query('INSERT INTO visits (ip) VALUES ($1)', [ip]);
    res.status(201).json({ message: 'Visit logged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/visits', adminAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as total FROM visits');
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'King Villa API is running' });
});

// Simple error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
