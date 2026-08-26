import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import Booking from './pages/Booking';
import Payment from './pages/Payment';
import Receipt from './pages/Receipt';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';
import Login from './pages/Login';
import './index.css';

const MobileNav = () => {
  const location = useLocation();
  const path = location.pathname;
  
  return (
    <div className="mobile-bottom-nav no-print">
      <Link to="/" className={`mobile-nav-item ${path === '/' ? 'active' : ''}`}>
        <span className="mobile-nav-icon">🏠</span>
        <span>Home</span>
      </Link>
      <Link to="/rooms" className={`mobile-nav-item ${path.startsWith('/rooms') || path.startsWith('/booking') ? 'active' : ''}`}>
        <span className="mobile-nav-icon">🛏️</span>
        <span>Rooms</span>
      </Link>
      <Link to="/my-bookings" className={`mobile-nav-item ${path === '/my-bookings' ? 'active' : ''}`}>
        <span className="mobile-nav-icon">📅</span>
        <span>Bookings</span>
      </Link>
      <Link to="/admin" className={`mobile-nav-item ${path === '/admin' ? 'active' : ''}`}>
        <span className="mobile-nav-icon">⚙️</span>
        <span>Admin</span>
      </Link>
    </div>
  );
};

function App() {
  React.useEffect(() => {
    // Only log visit once per session to avoid inflation
    if (!sessionStorage.getItem('visited')) {
      fetch('/api/visits', { method: 'POST' })
        .then(() => sessionStorage.setItem('visited', 'true'))
        .catch(err => console.error('Error logging visit:', err));
    }
  }, []);

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

        <footer style={{
          textAlign: 'center', 
          padding: '2rem 1rem', 
          marginTop: 'auto', 
          background: '#111', 
          borderTop: '1px solid #333',
          color: '#ccc',
          fontSize: '0.9rem'
        }}>
          <div style={{maxWidth: '800px', margin: '0 auto'}}>
            <p style={{marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--primary-color)'}}>👑 <strong>King Villa</strong></p>
            <p style={{marginBottom: '0.5rem'}}>
              <strong>Address:</strong> Devka Daman Road, Devka Beach, Village Marwad, Near Marwad Panchayat, Nani Daman, Daman
            </p>
            <p style={{marginBottom: '0.5rem'}}>
              <strong>Contact:</strong> <a href="tel:+919574090292" style={{color: '#fff', textDecoration: 'none'}}>+91 9574090292</a>
            </p>
            <div style={{marginBottom: '1.5rem', background: '#222', padding: '1rem', borderRadius: '8px', textAlign: 'left', border: '1px solid #333'}}>
              <h4 style={{marginBottom: '0.5rem', color: '#ffb300'}}>Explore Nearby</h4>
              <p style={{marginBottom: '0.5rem', fontSize: '0.85rem'}}>
                <strong>🍳 Best Breakfast:</strong> Surti Omlet (approx. 30m) <br/>
                <a href="https://www.google.com/maps/search/?api=1&query=Surti+Omlet,+Devka+Road,+Daman" target="_blank" rel="noreferrer" style={{color: '#4fc3f7', textDecoration: 'none'}}>📍 Open in Google Maps</a>
              </p>
              <p style={{marginBottom: '0.5rem', fontSize: '0.85rem'}}>
                <strong>🍷 Wine Shop:</strong> Sea Shore Wines (approx. 500m) <br/>
                <a href="https://www.google.com/maps/search/?api=1&query=Sea+Shore+Wines,+Devka+Road,+Daman" target="_blank" rel="noreferrer" style={{color: '#4fc3f7', textDecoration: 'none'}}>📍 Open in Google Maps</a>
              </p>
              <p style={{marginBottom: '0', fontSize: '0.85rem'}}>
                <strong>🍽️ Best Veg & Non-Veg Restaurant:</strong> Veera Da Dhaba (approx. 3km, Varkund) <br/>
                <a href="https://www.google.com/maps/search/?api=1&query=Veera+Da+Dhaba,+Varkund,+Daman" target="_blank" rel="noreferrer" style={{color: '#4fc3f7', textDecoration: 'none'}}>📍 Open in Google Maps</a>
              </p>
            </div>
            
            {/* Google Maps Embed */}
            <div style={{width: '100%', overflow: 'hidden', borderRadius: '8px', border: '1px solid #333'}}>
              <iframe 
                src="https://maps.google.com/maps?q=King%20Villa%202,%20Daman&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="300" 
                style={{border: 0, display: 'block'}} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="King Villa Location"
              ></iframe>
            </div>
          </div>
        </footer>
        
        <MobileNav />
      </div>
    </Router>
  );
}

export default App;
