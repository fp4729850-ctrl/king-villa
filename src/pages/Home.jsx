import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ImageCarousel from '../components/ImageCarousel';

function Home() {
  const [rooms, setRooms] = useState([]);
  const [entireVilla, setEntireVilla] = useState(null);

  useEffect(() => {
    axios.get('/api/rooms')
      .then(res => {
        const allRooms = res.data;
        setRooms(allRooms.filter(r => !r.isEntireVilla).slice(0, 4));
        setEntireVilla(allRooms.find(r => r.isEntireVilla));
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <>
      <main className="hero">
        <div className="hero-overlay"></div>
        <h1 className="hero-title">DAMAN</h1>
        <p className="hero-desc">
          Experience unparalleled luxury in our exclusive royal rooms. Your private paradise awaits.<br/>
          <span style={{display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '20px', fontSize: '0.95rem', fontWeight: '500'}}>
            🏖️ Beach is just a 2-minute walk (100m) from King Villa
          </span>
        </p>
        
        <div className="hero-buttons">
          <Link to="/rooms" className="btn btn-primary">Book Your Stay</Link>
          <a href="#rooms" className="btn btn-outline">Explore Rooms</a>
        </div>

        <div className="scroll-indicator">
          v
        </div>
      </main>

      <section id="rooms" className="rooms-section">
        <div className="section-header">
          <h3 className="section-subtitle">OUR ROOMS</h3>
          <h2 className="section-title">Royal Accommodations</h2>
        </div>

        <div className="rooms-grid">
          {rooms.length > 0 ? rooms.map(room => (
            <div className="room-card" key={room.id}>
              <div className="room-image-container">
                <ImageCarousel images={room.images} altText={room.name} />
                <div className="room-price">₹{room.price}/night</div>
              </div>
              <div className="room-info">
                <h3 className="room-name">{room.name}</h3>
                <p className="room-desc">{room.description}</p>
                <div style={{marginBottom: '1rem', color: 'var(--primary-color)', fontSize: '0.9rem'}}>
                  Amenities: {room.amenities.join(', ')} | Capacity: {room.capacity}
                </div>
                
                {room.isBookedToday && (
                  <div style={{background: 'rgba(255, 0, 0, 0.1)', color: '#ff6b6b', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold'}}>
                    Currently Booked Today
                  </div>
                )}

                <Link to={`/booking/${room.id}`} className="btn btn-primary btn-block text-center" style={{ textDecoration: 'none' }}>Book This Room</Link>
              </div>
            </div>
          )) : <div className="text-center" style={{width: '100%', padding: '2rem'}}>Loading rooms...</div>}
        </div>

        {entireVilla && (
          <div style={{textAlign: 'center', marginTop: '4rem'}}>
            <h3 style={{color: 'var(--primary-color)', marginBottom: '0.5rem', fontSize: '1.5rem'}}>Looking for complete privacy?</h3>
            <p style={{color: '#ccc', marginBottom: '1.5rem', fontSize: '1rem'}}>
              Book the entire villa and get exclusive access to our <strong>Private Kitchen</strong>.
            </p>
            {entireVilla.isBookedToday ? (
              <div style={{display: 'inline-block', background: 'rgba(255, 0, 0, 0.1)', color: '#ff6b6b', padding: '1rem 2rem', borderRadius: '4px', fontWeight: 'bold'}}>
                Entire Villa is Currently Booked Today
              </div>
            ) : (
              <Link to={`/booking/${entireVilla.id}`} className="btn btn-primary" style={{fontSize: '1.2rem', padding: '1rem 3rem'}}>
                Book Entire King Villa
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default Home;
