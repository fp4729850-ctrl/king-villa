import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Payment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    axios.get('/api/settings')
      .then(res => setSettings(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return alert('Please select a file');

    setUploading(true);
    const formData = new FormData();
    formData.append('paymentProof', file);

    axios.post(`/api/bookings/${bookingId}/payment`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('token')}` 
      }
    })
    .then(res => {
      setUploading(false);
      alert('Payment proof uploaded successfully!');
      // Navigate to my bookings or receipt (we need the ref code for receipt, let's just go to my bookings for now)
      navigate('/my-bookings');
    })
    .catch(err => {
      setUploading(false);
      console.error(err);
      alert('Upload failed');
    });
  };

  if (!settings) return <div className="rooms-section text-center" style={{paddingTop: '8rem'}}>Loading payment details...</div>;

  return (
    <section className="rooms-section" style={{paddingTop: '8rem', minHeight: '100vh'}}>
      <div className="section-header">
        <h3 className="section-subtitle">SECURE PAYMENT</h3>
        <h2 className="section-title">Complete Your Booking</h2>
      </div>

      <div style={{maxWidth: '500px', margin: '0 auto', background: '#1a1a1a', padding: '2rem', borderRadius: '8px', textAlign: 'center'}}>
        <p style={{marginBottom: '1rem'}}>Please scan the QR code below or use the UPI ID to complete your payment.</p>
        
        <div style={{background: '#fff', padding: '1rem', display: 'inline-block', borderRadius: '8px', marginBottom: '1rem'}}>
          {/* Mock QR Code */}
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${settings.upiId}`} alt="UPI QR" />
        </div>
        
        <h3 style={{color: 'var(--primary-color)', marginBottom: '2rem'}}>UPI ID: {settings.upiId}</h3>

        <form onSubmit={handleUpload}>
          <div style={{marginBottom: '1.5rem', textAlign: 'left'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Upload Payment Screenshot</label>
            <input type="file" accept="image/*" required onChange={e => setFile(e.target.files[0])} style={{width: '100%'}} />
          </div>
          
          <button type="submit" className="btn btn-primary btn-block" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Submit Payment Proof'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Payment;
