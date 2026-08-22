import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ImageCarousel from '../components/ImageCarousel';

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/rooms')
      .then(res => {
        setRooms(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="rooms-section text-center" style={{paddingTop: '8rem'}}>Loading rooms...</div>;

  return (
    <section className="rooms-section" style={{paddingTop: '8rem'}}>
      <div className="section-header">
        <h3 className="section-subtitle">OUR ROOMS</h3>
        <h2 className="section-title">All Accommodations</h2>
      </div>

      <div className="rooms-grid">
        {rooms.map(room => (
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
              <Link to={`/booking/${room.id}`} className="btn btn-primary btn-block text-center" style={{ textDecoration: 'none' }}>Book This Room</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Rooms;
