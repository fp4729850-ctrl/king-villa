const router = require('express').Router();
const db = require('../db');
const ical = require('node-ical');
const icalGenerator = require('ical-generator').default;
const { adminAuth } = require('./auth');

// 1. EXPORT iCal: Platforms will GET this link
router.get(['/export/:roomId', '/export/:roomId.ics'], async (req, res) => {
  try {
    const roomId = req.params.roomId.replace('.ics', '');
    const roomRes = await db.query('SELECT name FROM rooms WHERE id = $1', [roomId]);
    if (roomRes.rows.length === 0) return res.status(404).send('Room not found');
    
    const roomName = roomRes.rows[0].name;

    const bookingsRes = await db.query(`
      SELECT * FROM bookings 
      WHERE "roomId" = $1 AND status IN ('paid', 'confirmed', 'cancel_request', 'external')
    `, [roomId]);

    const cal = icalGenerator({ 
      name: `King Villa - ${roomName}`,
      method: 'PUBLISH'
    });

    // Add a dummy event in the past so the calendar is never empty (fixes Agoda validation)
    cal.createEvent({
      start: new Date('2020-01-01'),
      end: new Date('2020-01-02'),
      allDay: true,
      summary: 'Calendar Creation',
      description: 'System dummy event',
      id: 'dummy-event-1'
    });

    bookingsRes.rows.forEach(b => {
      cal.createEvent({
        start: new Date(b.checkIn),
        end: new Date(b.checkOut),
        allDay: true,
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
async function performSync() {
  const roomsRes = await db.query('SELECT id, "icalLinks" FROM rooms');
  let importedCount = 0;

  for (const room of roomsRes.rows) {
    const linksData = JSON.parse(room.icalLinks || '{}');
    // linksData is an object like { airbnb: '...', booking: '...', agoda: '...', goibibo: '...' }
    const platformEntries = Array.isArray(linksData) 
      ? linksData.map(url => ({ platform: 'OTA', url }))
      : Object.entries(linksData)
          .filter(([_, url]) => url && url.trim() !== '')
          .map(([platform, url]) => ({ 
            platform: platform === 'airbnb' ? 'Airbnb' 
                    : platform === 'booking' ? 'Booking.com' 
                    : platform === 'agoda' ? 'Agoda' 
                    : platform === 'goibibo' ? 'Goibibo/MMT' 
                    : platform,
            url 
          }));

    if (platformEntries.length === 0) continue;

    for (const { platform, url } of platformEntries) {
      try {
        const events = await ical.async.fromURL(url);
        
        for (const key in events) {
          const ev = events[key];
          if (ev.type === 'VEVENT') {
            const start = ev.start.toISOString().split('T')[0];
            const end = ev.end.toISOString().split('T')[0];
            const uid = ev.uid || Math.random().toString(36).substring(2);
            const refCode = `OTA-${platform.replace(/[^a-zA-Z]/g, '')}-${uid}`.substring(0, 50);

            // Check if already imported
            const existRes = await db.query('SELECT id FROM bookings WHERE "refCode" = $1', [refCode]);
            
            if (existRes.rows.length === 0) {
              const overlapRes = await db.query(`
                SELECT id FROM bookings
                WHERE "roomId" = $1 
                AND status IN ('paid', 'confirmed', 'cancel_request', 'external')
                AND ("checkIn" < $2 AND "checkOut" > $3)
              `, [room.id, end, start]);

              if (overlapRes.rows.length === 0) {
                await db.query(
                  'INSERT INTO bookings ("userId", "roomId", "checkIn", "checkOut", amount, status, "refCode", "guestDetails") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                  [1, room.id, start, end, 0, 'external', refCode, 
                   JSON.stringify({ 
                     note: ev.summary || 'OTA Import', 
                     platform: platform,
                     source: platform
                   })]
                );
                importedCount++;
              }
            }
          }
        }
      } catch (e) {
        console.error(`Error syncing ${platform} link:`, e.message);
      }
    }
  }
  return importedCount;
}

router.post('/sync', adminAuth, async (req, res) => {
  try {
    const importedCount = await performSync();
    res.json({ message: `Sync complete. Imported ${importedCount} new external bookings.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2b. CRON IMPORT iCal: Automated sync every 12 hours via Vercel Cron
router.get('/cron/sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized cron request' });
    }
    
    const importedCount = await performSync();
    res.json({ message: `Cron sync complete. Imported ${importedCount} new bookings.` });
  } catch (err) {
    console.error('Cron sync error:', err);
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
