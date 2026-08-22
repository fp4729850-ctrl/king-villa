require('dotenv').config();
const db = require('./server/db');
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function test() {
  try {
    const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'secret_key');
    
    // Instead of full server, let's just test the logic directly
    const roomsRes = await db.query('SELECT id, "icalLinks" FROM rooms');
    console.log("Rooms fetched:", roomsRes.rows.length);
    
    const ical = require('node-ical');
    for (const room of roomsRes.rows) {
      console.log("Processing room", room.id);
      const links = JSON.parse(room.icalLinks || '[]');
      if (links.length === 0) continue;
      
      for (const link of links) {
        console.log("Fetching link", link);
        const events = await ical.async.fromURL(link);
        console.log("Events fetched");
      }
    }
    console.log("Success");
  } catch (err) {
    console.error("ERROR:", err.message);
  }
  process.exit(0);
}
test();
