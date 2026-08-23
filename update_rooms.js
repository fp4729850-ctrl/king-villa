const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateAmenities() {
  try {
    const res = await pool.query('SELECT id, amenities FROM rooms');
    for (const row of res.rows) {
      let amenities = [];
      try {
        amenities = JSON.parse(row.amenities);
      } catch (e) {
        amenities = [];
      }
      if (!amenities.includes('Private Parking')) {
        amenities.push('Private Parking');
        await pool.query('UPDATE rooms SET amenities = $1 WHERE id = $2', [JSON.stringify(amenities), row.id]);
        console.log(`Updated room ${row.id}`);
      }
    }
    console.log('Finished updating amenities');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

updateAmenities();
