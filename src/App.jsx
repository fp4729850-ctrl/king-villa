import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import Booking from './pages/Booking';
import Payment from './pages/Payment';
import Receipt from './pages/Receipt';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';
import Login from './pages/Login';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <Link to="/" className="nav-logo" style={{ textDecoration: 'none' }}>
            <span className="nav-logo-icon">👑</span> KING VILLA
          </Link>
          <div className="nav-links">
            <Link to="/rooms" className="nav-link">Rooms</Link>
            <Link to="/my-bookings" className="nav-link">My Bookings</Link>
            <Link to="/admin" className="nav-link">Admin</Link>
            <Link to="/login" className="nav-link">Login</Link>
          </div>
          <Link to="/rooms" className="btn btn-primary" style={{ textDecoration: 'none' }}>Book Now</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/booking/:roomId" element={<Booking />} />
          <Route path="/payment/:bookingId" element={<Payment />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/receipt/:ref" element={<Receipt />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
