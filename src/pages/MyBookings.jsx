import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    axios.get('http://localhost:5000/api/bookings/my', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setBookings(res.data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="rooms-section text-center" style={{paddingTop: '8rem'}}>Loading...</div>;

  return (
    <section className="rooms-section" style={{paddingTop: '8rem', minHeight: '100vh'}}>
      <div className="section-header">
        <h3 className="section-subtitle">YOUR HISTORY</h3>
        <h2 className="section-title">My Bookings</h2>
      </div>

      <div style={{maxWidth: '800px', margin: '0 auto'}}>
        {bookings.length === 0 ? (
          <p className="text-center">You have no bookings yet.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {bookings.map(b => (
              <div key={b.id} style={{background: '#1a1a1a', padding: '1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h3 style={{color: 'var(--primary-color)'}}>{b.roomName}</h3>
                  <p>Check In: {b.checkIn} | Check Out: {b.checkOut}</p>
                  <p>Status: <span style={{textTransform: 'uppercase', fontWeight: 'bold'}}>{b.status}</span></p>
                </div>
                <div>
                  <h3 style={{marginBottom: '0.5rem'}}>₹{b.amount}</h3>
                  <Link to={`/receipt/${b.refCode}`} className="btn btn-outline" style={{padding: '0.5rem 1rem'}}>View Receipt</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default MyBookings;
