require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const updateImages = async () => {
  try {
    await pool.query('UPDATE rooms SET images = $1 WHERE id = 1', [JSON.stringify(["/room1.jpg","/room1_2.jpg","/room1_3.jpg","/room1_4.jpg","/room1_5.jpg"])]);
    await pool.query('UPDATE rooms SET images = $1 WHERE id = 2', [JSON.stringify(["/room2.jpg","/room2_2.jpg"])]);
    await pool.query('UPDATE rooms SET images = $1 WHERE id = 3', [JSON.stringify(["/room3.jpg"])]);
    await pool.query('UPDATE rooms SET images = $1 WHERE id = 4', [JSON.stringify(["/room4.jpg","/room4_2.jpg"])]);
    console.log("Images updated successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
};

updateImages();
