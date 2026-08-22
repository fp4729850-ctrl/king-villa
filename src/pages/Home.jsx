import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ImageCarousel from '../components/ImageCarousel';

function Home() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    axios.get('/api/rooms')
      .then(res => setRooms(res.data.slice(0, 4)))
      .catch(err => console.error(err));
  }, []);

  return (
    <>
      <main className="hero">
        <img 
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop" 
          alt="King Villa luxury background" 
          className="hero-bg"
        />
        <div className="hero-overlay"></div>
        
        <div className="hero-subtitle">Welcome To</div>
        <h1 className="hero-title">
          King <span className="hero-title-accent">Villa</span>
        </h1>
        <p className="hero-desc">
          Experience unparalleled luxury in our exclusive royal rooms. Your private paradise awaits.
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
                <Link to={`/booking/${room.id}`} className="btn btn-primary btn-block text-center" style={{ textDecoration: 'none' }}>Book This Room</Link>
              </div>
            </div>
          )) : <div className="text-center" style={{width: '100%', padding: '2rem'}}>Loading rooms...</div>}
        </div>
      </section>
    </>
  );
}

export default Home;
