import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cancelPrompt, setCancelPrompt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchBookings = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    axios.get('/api/bookings/my', {
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
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = (bookingId) => {
    if(!cancelReason.trim()) {
      alert('Please provide a reason for cancellation.');
      return;
    }
    const token = localStorage.getItem('token');
    axios.post(`/api/bookings/${bookingId}/cancel`, { reason: cancelReason }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      alert('Cancellation request submitted successfully.');
      setCancelPrompt(null);
      setCancelReason('');
      fetchBookings();
    })
    .catch(err => {
      console.error(err);
      alert(err.response?.data?.error || 'Error submitting cancellation request');
    });
  };

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
              <div key={b.id} style={{background: '#1a1a1a', padding: '1.5rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                  <div>
                    <h3 style={{color: 'var(--primary-color)'}}>{b.roomName}</h3>
                    <p>Check In: {b.checkIn} | Check Out: {b.checkOut}</p>
                    <p>Status: <span style={{textTransform: 'uppercase', fontWeight: 'bold', color: b.status === 'cancel_request' ? '#ff9800' : (b.status === 'cancelled' ? '#ff5252' : '#fff')}}>{b.status.replace('_', ' ')}</span></p>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <h3 style={{marginBottom: '0.5rem'}}>₹{b.amount}</h3>
                    <Link to={`/receipt/${b.refCode}`} className="btn btn-outline" style={{padding: '0.5rem 1rem', fontSize: '0.9rem'}}>View Receipt</Link>
                  </div>
                </div>

                {/* Cancel Booking Logic */}
                {(b.status === 'pending' || b.status === 'paid' || b.status === 'confirmed') && cancelPrompt !== b.id && (
                  <div style={{borderTop: '1px solid #333', paddingTop: '1rem', textAlign: 'right'}}>
                    <button onClick={() => setCancelPrompt(b.id)} style={{background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer', textDecoration: 'underline'}}>Request Cancellation</button>
                  </div>
                )}

                {cancelPrompt === b.id && (
                  <div style={{background: '#2a2a2a', padding: '1rem', borderRadius: '4px', marginTop: '0.5rem'}}>
                    <p style={{marginBottom: '0.5rem', fontWeight: 'bold'}}>Reason for Cancellation:</p>
                    <textarea 
                      value={cancelReason} 
                      onChange={e => setCancelReason(e.target.value)} 
                      rows="2" 
                      placeholder="Please tell us why you are cancelling..."
                      style={{width: '100%', padding: '0.5rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px', marginBottom: '1rem'}}
                    ></textarea>
                    <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                      <button onClick={() => { setCancelPrompt(null); setCancelReason(''); }} className="btn btn-outline" style={{padding: '0.4rem 0.8rem', fontSize: '0.9rem'}}>Go Back</button>
                      <button onClick={() => handleCancel(b.id)} className="btn btn-primary" style={{padding: '0.4rem 0.8rem', fontSize: '0.9rem', background: '#ff5252', borderColor: '#ff5252'}}>Confirm Cancel</button>
                    </div>
                  </div>
                )}
                
                {b.status === 'cancel_request' && (
                  <div style={{background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', padding: '0.8rem', borderRadius: '4px', fontSize: '0.9rem', marginTop: '0.5rem'}}>
                    Your cancellation request is pending admin approval.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default MyBookings;
