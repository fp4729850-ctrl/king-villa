const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    capacity INTEGER DEFAULT 2,
    amenities TEXT,
    images TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    roomId INTEGER NOT NULL,
    checkIn TEXT NOT NULL,
    checkOut TEXT NOT NULL,
    guestDetails TEXT,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    paymentProof TEXT,
    refCode TEXT UNIQUE,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(roomId) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS siteSettings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qrCode TEXT,
    upiId TEXT,
    contactEmail TEXT,
    contactPhone TEXT
  );
`);

// Seed initial rooms if empty
const count = db.prepare('SELECT COUNT(*) as count FROM rooms').get();
if (count.count === 0) {
  const insertRoom = db.prepare('INSERT INTO rooms (name, description, price, capacity, amenities, images) VALUES (?, ?, ?, ?, ?, ?)');
  const defaultRooms = [
    { name: 'Room Number 1', desc: 'The pinnacle of luxury — king bed, private balcony, and panoramic views.', price: 2500 },
    { name: 'Room Number 2', desc: 'Regal interiors with plush furnishings and an en-suite luxury bathroom.', price: 1600 },
    { name: 'Room Number 3', desc: 'Serene garden-facing room with natural light and elegant decor.', price: 1600 },
    { name: 'Room Number 4', desc: 'Wake up steps away from the private pool with breathtaking views.', price: 1600 },
  ];
  defaultRooms.forEach(r => {
    insertRoom.run(r.name, r.desc, r.price, 2, JSON.stringify(['WiFi', 'AC', 'TV']), JSON.stringify(['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1000&auto=format&fit=crop']));
  });
}

module.exports = db;
