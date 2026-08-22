import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Booking() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookedDates, setBookedDates] = useState([]);
  const [dateError, setDateError] = useState('');
  const [nights, setNights] = useState(1);
  
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    name: '',
    phone: '',
    paymentType: 'full'
  });

  useEffect(() => {
    axios.get(`/api/rooms/${roomId}`)
      .then(res => {
        setRoom(res.data);
        return axios.get(`/api/bookings/room/${roomId}/dates`);
      })
      .then(res => {
        setBookedDates(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [roomId]);

  useEffect(() => {
    if (formData.checkIn && formData.checkOut) {
      const start = new Date(formData.checkIn);
      const end = new Date(formData.checkOut);
      
      if (start >= end) {
        setDateError('Check-out must be after check-in.');
        setNights(1);
        return;
      }
      
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setNights(diffDays);
      
      const overlap = bookedDates.some(b => {
        const bStart = new Date(b.checkIn);
        const bEnd = new Date(b.checkOut);
        return (start < bEnd && end > bStart);
      });
      
      if (overlap) {
        setDateError('Sorry, this room is already booked for these dates.');
      } else {
        setDateError('');
      }
    }
  }, [formData.checkIn, formData.checkOut, bookedDates]);

  const totalAmount = (room?.price || 0) * nights;
  const advanceAmount = Math.round(totalAmount * 0.30);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (dateError) return;
    
    const amountToPay = formData.paymentType === 'advance' ? advanceAmount : totalAmount;
    
    const token = localStorage.getItem('token');
    if(!token) {
      alert("Please login first! Redirecting to login...");
      window.location.href = '/login';
      return;
    }
    
    axios.post('/api/bookings', {
      roomId,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guestDetails: { 
        name: formData.name, 
        phone: formData.phone, 
        count: formData.guests,
        paymentType: formData.paymentType,
        totalAmount: totalAmount,
        advancePaid: amountToPay,
        balanceAmount: totalAmount - amountToPay
      },
      amount: amountToPay
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      navigate(`/payment/${res.data.bookingId}`);
    })
    .catch(err => {
      console.error(err);
      alert(err.response?.data?.error || 'Error creating booking');
    });
  };

  if (loading) return <div className="rooms-section text-center" style={{paddingTop: '8rem'}}>Loading room details...</div>;
  if (!room) return <div className="rooms-section text-center" style={{paddingTop: '8rem'}}>Room not found</div>;

  return (
    <section className="rooms-section" style={{paddingTop: '8rem', minHeight: '100vh'}}>
      <div className="section-header">
        <h3 className="section-subtitle">RESERVATION</h3>
        <h2 className="section-title">Book {room.name}</h2>
      </div>

      <div style={{maxWidth: '600px', margin: '0 auto', background: '#1a1a1a', padding: '2rem', borderRadius: '8px'}}>
        <h3 style={{marginBottom: '1rem'}}>{room.name} - ₹{room.price}/night</h3>
        <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>{room.description}</p>
        
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Full Name</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px'}} />
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Phone</label>
            <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px'}} />
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <div style={{flex: 1}}>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Check In</label>
              <input type="date" required value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px'}} />
            </div>
            <div style={{flex: 1}}>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Check Out</label>
              <input type="date" required value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px'}} />
            </div>
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Guests</label>
            <input type="number" min="1" max={room.capacity} required value={formData.guests} onChange={e => setFormData({...formData, guests: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px'}} />
          </div>

          {dateError && (
            <div style={{color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.1)', padding: '1rem', borderRadius: '4px', border: '1px solid #ff6b6b'}}>
              {dateError}
            </div>
          )}

          <div style={{marginTop: '1rem', padding: '1rem', background: '#222', borderRadius: '4px'}}>
            <label style={{display: 'block', marginBottom: '1rem', fontWeight: 'bold'}}>Payment Option</label>
            <div style={{display: 'flex', gap: '2rem'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                <input type="radio" name="paymentType" value="full" checked={formData.paymentType === 'full'} onChange={() => setFormData({...formData, paymentType: 'full'})} />
                Pay Full Amount (₹{totalAmount})
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                <input type="radio" name="paymentType" value="advance" checked={formData.paymentType === 'advance'} onChange={() => setFormData({...formData, paymentType: 'advance'})} />
                Pay 30% Advance (₹{advanceAmount})
              </label>
            </div>
            {nights > 1 && <p style={{fontSize: '0.9rem', color: '#ffb300', marginTop: '1rem'}}>Total price calculated for {nights} nights.</p>}
          </div>
          
          <button type="submit" className="btn btn-primary" style={{marginTop: '1rem'}}>
            Proceed to Payment (₹{formData.paymentType === 'advance' ? advanceAmount : totalAmount})
          </button>
        </form>
      </div>
    </section>
  );
}

export default Booking;
