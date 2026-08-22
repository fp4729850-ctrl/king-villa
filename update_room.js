require('dotenv').config();
const { query } = require('./server/db');

async function updateRoom() {
  try {
    await query(
      'UPDATE rooms SET amenities = $1, capacity = $2 WHERE id = 1',
      [JSON.stringify(['WiFi', 'AC', 'TV', 'Private Balcony', 'Coffee Maker']), 5]
    );
    console.log('Room 1 updated successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateRoom();
