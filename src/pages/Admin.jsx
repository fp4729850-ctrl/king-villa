import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Admin() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Settings state
  const [settings, setSettings] = useState({ upiId: '', qrCode: '' });
  const [qrFile, setQrFile] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'admin') {
      alert('Access denied. Admin only.');
      window.location.href = '/login';
      return;
    }

    fetchBookings(token);
    fetchSettings();
  }, []);

  const fetchBookings = (token) => {
    axios.get('/api/bookings', {
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
  }

  const fetchSettings = () => {
    axios.get('/api/settings')
      .then(res => {
        if(res.data) {
          setSettings({ upiId: res.data.upiId || '', qrCode: res.data.qrCode || '' });
        }
      })
      .catch(err => console.error(err));
  }

  const updateStatus = (id, status) => {
    axios.put(`/api/bookings/${id}/status`, { status }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(() => {
      fetchBookings(localStorage.getItem('token'));
    })
    .catch(err => console.error(err));
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);

    let base64Qr = settings.qrCode;

    if (qrFile) {
      base64Qr = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(qrFile);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    }

    axios.put('/api/settings', {
      qrCode: base64Qr,
      upiId: settings.upiId,
      contactEmail: 'hello@kingvilla.com', // keep defaults
      contactPhone: '+91 9876543210'
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(() => {
      alert('Settings saved successfully!');
      setSettingsLoading(false);
      fetchSettings();
    })
    .catch(err => {
      console.error(err);
      alert('Failed to save settings');
      setSettingsLoading(false);
    });
  }

  if (loading) return <div className="rooms-section text-center" style={{paddingTop: '8rem'}}>Loading...</div>;

  return (
    <section className="rooms-section" style={{paddingTop: '8rem', minHeight: '100vh'}}>
      <div className="section-header">
        <h3 className="section-subtitle">DASHBOARD</h3>
        <h2 className="section-title">Admin Management</h2>
      </div>

      <div style={{maxWidth: '1000px', margin: '0 auto 2rem auto', background: '#1a1a1a', padding: '2rem', borderRadius: '8px'}}>
        <h3 style={{marginBottom: '1.5rem', color: 'var(--primary-color)'}}>Site Settings (Payment)</h3>
        <form onSubmit={handleSettingsSave} style={{display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px'}}>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>UPI ID</label>
            <input 
              type="text" 
              value={settings.upiId}
              onChange={e => setSettings({...settings, upiId: e.target.value})}
              style={{width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #333', background: '#222', color: '#fff'}}
            />
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Upload QR Code</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={e => setQrFile(e.target.files[0])}
              style={{width: '100%', padding: '0.8rem', borderRadius: '4px', background: '#222', color: '#fff'}}
            />
            {settings.qrCode && !qrFile && (
              <div style={{marginTop: '1rem'}}>
                <p style={{fontSize: '0.8rem', color: '#aaa'}}>Current QR Code:</p>
                <img src={settings.qrCode} alt="Current QR" style={{height: '100px', borderRadius: '4px'}} />
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={settingsLoading}>
            {settingsLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      <div style={{maxWidth: '1000px', margin: '0 auto', background: '#1a1a1a', padding: '2rem', borderRadius: '8px'}}>
        <h3 style={{marginBottom: '1.5rem', color: 'var(--primary-color)'}}>All Bookings</h3>
        
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '1px solid #333'}}>
                <th style={{padding: '1rem'}}>Ref</th>
                <th style={{padding: '1rem'}}>User</th>
                <th style={{padding: '1rem'}}>Room</th>
                <th style={{padding: '1rem'}}>Amount</th>
                <th style={{padding: '1rem'}}>Proof</th>
                <th style={{padding: '1rem'}}>Status</th>
                <th style={{padding: '1rem'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} style={{borderBottom: '1px solid #222'}}>
                  <td style={{padding: '1rem'}}>{b.refCode}</td>
                  <td style={{padding: '1rem'}}>{b.userName}</td>
                  <td style={{padding: '1rem'}}>{b.roomName}</td>
                  <td style={{padding: '1rem'}}>₹{b.amount}</td>
                  <td style={{padding: '1rem'}}>
                    {b.paymentProof ? (
                      b.paymentProof.startsWith('data:image') 
                        ? <a href={b.paymentProof} target="_blank" rel="noreferrer" style={{color: '#4fc3f7'}}>View</a>
                        : <a href={`http://localhost:5000${b.paymentProof}`} target="_blank" rel="noreferrer" style={{color: '#4fc3f7'}}>View</a>
                    ) : 'None'}
                  </td>
                  <td style={{padding: '1rem', fontWeight: 'bold'}}>{b.status}</td>
                  <td style={{padding: '1rem'}}>
                    <select 
                      value={b.status} 
                      onChange={(e) => updateStatus(b.id, e.target.value)}
                      style={{padding: '0.3rem', background: '#333', color: '#fff', border: 'none'}}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Admin;
