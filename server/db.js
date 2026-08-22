require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        capacity INTEGER DEFAULT 2,
        amenities TEXT,
        images TEXT
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "roomId" INTEGER NOT NULL,
        "checkIn" TEXT NOT NULL,
        "checkOut" TEXT NOT NULL,
        "guestDetails" TEXT,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        "paymentProof" TEXT,
        "refCode" TEXT UNIQUE,
        FOREIGN KEY("userId") REFERENCES users(id),
        FOREIGN KEY("roomId") REFERENCES rooms(id)
      );

      CREATE TABLE IF NOT EXISTS siteSettings (
        id SERIAL PRIMARY KEY,
        "qrCode" TEXT,
        "upiId" TEXT,
        "contactEmail" TEXT,
        "contactPhone" TEXT
      );
    `);
    
    // Seed initial rooms if empty
    const res = await pool.query('SELECT COUNT(*) as count FROM rooms');
    if (parseInt(res.rows[0].count) === 0) {
      const defaultRooms = [
        { name: 'Room Number 1', desc: 'The pinnacle of luxury — king bed, private balcony, and panoramic views.', price: 2500 },
        { name: 'Room Number 2', desc: 'Regal interiors with plush furnishings and an en-suite luxury bathroom.', price: 1600 },
        { name: 'Room Number 3', desc: 'Serene garden-facing room with natural light and elegant decor.', price: 1600 },
        { name: 'Room Number 4', desc: 'Wake up steps away from the private pool with breathtaking views.', price: 1600 },
      ];
      for (const r of defaultRooms) {
        await pool.query(
          'INSERT INTO rooms (name, description, price, capacity, amenities, images) VALUES ($1, $2, $3, $4, $5, $6)',
          [r.name, r.desc, r.price, 2, JSON.stringify(['WiFi', 'AC', 'TV']), JSON.stringify(['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1000&auto=format&fit=crop'])]
        );
      }
    }
    
    // Migration: add isEntireVilla column if not exists
    try {
      await pool.query('ALTER TABLE rooms ADD COLUMN "isEntireVilla" BOOLEAN DEFAULT false');
    } catch(err) {
      // column likely already exists, ignore
    }

    // Seed Entire Villa room if not exists
    const entireVillaRes = await pool.query('SELECT * FROM rooms WHERE "isEntireVilla" = true');
    if (entireVillaRes.rows.length === 0) {
      await pool.query(
        'INSERT INTO rooms (name, description, price, capacity, amenities, images, "isEntireVilla") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['Entire King Villa', 'Experience ultimate luxury and privacy by booking the entire property. Includes all 4 royal rooms, private pool access, and exclusive amenities for your entire group.', 7300, 8, JSON.stringify(['WiFi', 'AC', 'TV', 'Private Pool', 'Kitchen']), JSON.stringify(['https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=1000&auto=format&fit=crop']), true]
      );
    }
  } catch (err) {
    console.error("DB Init error", err);
  }
};

if(process.env.DATABASE_URL) {
  initDB();
}

module.exports = {
  query: (text, params) => pool.query(text, params),
};
