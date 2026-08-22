const router = require('express').Router();
const db = require('../db');
const ical = require('node-ical');
const icalGenerator = require('ical-generator').default;
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// 1. EXPORT iCal: Platforms will GET this link
router.get('/export/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const roomRes = await db.query('SELECT name FROM rooms WHERE id = $1', [roomId]);
    if (roomRes.rows.length === 0) return res.status(404).send('Room not found');
    
    const roomName = roomRes.rows[0].name;

    const bookingsRes = await db.query(`
      SELECT * FROM bookings 
      WHERE "roomId" = $1 AND status IN ('paid', 'confirmed', 'cancel_request', 'external')
    `, [roomId]);

    const cal = icalGenerator({ name: `King Villa - ${roomName}` });

    bookingsRes.rows.forEach(b => {
      cal.createEvent({
        start: new Date(b.checkIn),
        end: new Date(b.checkOut),
        summary: b.status === 'external' ? 'OTA Booking' : 'King Villa Direct Booking',
        description: 'Reservation via King Villa / OTA Sync',
        id: b.refCode
      });
    });

    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${roomName.replace(/\s+/g, '_')}.ics"`);
    res.send(cal.toString());
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating calendar');
  }
});

// 2. IMPORT iCal: Admin triggers sync manually to fetch from external OTAs
router.post('/sync', adminAuth, async (req, res) => {
  try {
    const roomsRes = await db.query('SELECT id, "icalLinks" FROM rooms');
    let importedCount = 0;

    for (const room of roomsRes.rows) {
      const links = JSON.parse(room.icalLinks || '[]');
      if (links.length === 0) continue;

      for (const link of links) {
        try {
          const events = await ical.async.fromURL(link);
          
          for (const key in events) {
            const ev = events[key];
            if (ev.type === 'VEVENT') {
              const start = ev.start.toISOString().split('T')[0];
              const end = ev.end.toISOString().split('T')[0];
              const uid = ev.uid || Math.random().toString(36).substring(2);

              // Check if already imported
              const existRes = await db.query('SELECT id FROM bookings WHERE "refCode" = $1', [`OTA-${uid}`]);
              
              if (existRes.rows.length === 0) {
                // Check overlap to avoid inserting duplicates if they differ by UID
                const overlapRes = await db.query(`
                  SELECT id FROM bookings
                  WHERE "roomId" = $1 
                  AND status IN ('paid', 'confirmed', 'cancel_request', 'external')
                  AND ("checkIn" < $2 AND "checkOut" > $3)
                `, [room.id, end, start]);

                if (overlapRes.rows.length === 0) {
                  // Insert external booking
                  await db.query(
                    'INSERT INTO bookings ("userId", "roomId", "checkIn", "checkOut", amount, status, "refCode", "guestDetails") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [1, room.id, start, end, 0, 'external', `OTA-${uid}`, JSON.stringify({ note: ev.summary || 'OTA Import' })]
                  );
                  importedCount++;
                }
              }
            }
          }
        } catch (e) {
          console.error(`Error syncing link ${link}:`, e);
          // continue syncing other links
        }
      }
    }

    res.json({ message: `Sync complete. Imported ${importedCount} new external bookings.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update room ical links
router.put('/room/:roomId/links', adminAuth, async (req, res) => {
  try {
    const { links } = req.body; // array of strings
    await db.query('UPDATE rooms SET "icalLinks" = $1 WHERE id = $2', [JSON.stringify(links), req.params.roomId]);
    res.json({ message: 'Links updated successfully' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
