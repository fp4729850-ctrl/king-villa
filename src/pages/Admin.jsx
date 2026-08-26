import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Admin() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Settings state
  const [settings, setSettings] = useState({ upiId: '', qrCode: '' });
  const [qrFile, setQrFile] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Aadhar Modal State
  const [selectedAadhars, setSelectedAadhars] = useState(null);

  // Visits
  const [totalVisits, setTotalVisits] = useState(0);

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
    fetchRooms();
    fetchUsers(token);
    fetchVisits(token);
  }, []);

  const fetchVisits = (token) => {
    axios.get('/api/visits', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTotalVisits(res.data.total))
      .catch(err => console.error(err));
  };

  const fetchRooms = () => {
    axios.get('/api/rooms')
      .then(res => setRooms(res.data))
      .catch(err => console.error(err));
  };

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

  const fetchUsers = (token) => {
    setUsersLoading(true);
    axios.get('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setUsers(res.data); setUsersLoading(false); })
      .catch(err => { console.error(err); setUsersLoading(false); });
  };

  const handleRoleChange = (userId, newRole) => {
    if(!window.confirm(`Are you sure you want to make this user an ${newRole.toUpperCase()}?`)) return;
    axios.put(`/api/auth/users/${userId}/role`, { role: newRole }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
      alert(res.data.message);
      fetchUsers(localStorage.getItem('token'));
    })
    .catch(err => {
      alert(err.response?.data?.error || 'Failed to update role');
    });
  };

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
      contactPhone: '+91 9574090292'
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

  const handleIcalSave = (roomId, linksObj) => {
    axios.put(`/api/ical/room/${roomId}/links`, { links: linksObj }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(() => alert('iCal links saved successfully!'))
    .catch(err => alert('Error saving iCal links'));
  };

  const handleSync = () => {
    setSyncLoading(true);
    axios.post('/api/ical/sync', {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then((res) => {
      alert(res.data.message);
      setSyncLoading(false);
      fetchBookings(localStorage.getItem('token'));
    })
    .catch(err => {
      alert('Sync failed');
      setSyncLoading(false);
    });
  };

  const [directBooking, setDirectBooking] = useState({
    roomId: '',
    guestName: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    guestCount: 1,
    amount: 0,
    paymentType: 'cash',
    aadharCards: [] // Array to hold base64 images
  });
  const [directLoading, setDirectLoading] = useState(false);
  const [showDirectForm, setShowDirectForm] = useState(false);

  const handleDirectBooking = (e) => {
    e.preventDefault();
    setDirectLoading(true);
    axios.post('/api/bookings/admin-direct', directBooking, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
      alert(`✅ Booking Created!\nRef Code: ${res.data.refCode}`);
      setDirectBooking({ roomId: '', guestName: '', guestPhone: '', checkIn: '', checkOut: '', guestCount: 1, amount: 0, paymentType: 'cash', aadharCards: [] });
      setShowDirectForm(false);
      setDirectLoading(false);
      fetchBookings(localStorage.getItem('token'));
    })
    .catch(err => {
      alert(err.response?.data?.error || 'Booking failed');
      setDirectLoading(false);
    });
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAadharUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const compressedImages = await Promise.all(files.map(file => compressImage(file)));
      setDirectBooking(prev => ({
        ...prev,
        aadharCards: [...prev.aadharCards, ...compressedImages]
      }));
    } catch (err) {
      console.error("Error compressing image", err);
      alert("Failed to process image. Please try again.");
    }
  };

  const removeAadhar = (index) => {
    setDirectBooking(prev => ({
      ...prev,
      aadharCards: prev.aadharCards.filter((_, i) => i !== index)
    }));
  };

  if (loading) return <div className="rooms-section text-center" style={{paddingTop: '8rem'}}>Loading...</div>;

  return (
    <section className="rooms-section" style={{paddingTop: '8rem', minHeight: '100vh'}}>
      <div className="section-header">
        <h3 className="section-subtitle">DASHBOARD</h3>
        <h2 className="section-title">Admin Management</h2>
      </div>

      {/* Direct Booking for Walk-in */}
      <div style={{maxWidth: '1000px', margin: '0 auto 2rem auto', background: '#1a1a1a', padding: '2rem', borderRadius: '8px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <h3 style={{color: '#4caf50'}}>🏠 Direct Booking (Walk-in Customer)</h3>
          <button onClick={() => setShowDirectForm(!showDirectForm)} className="btn btn-primary" style={{padding: '0.5rem 1.5rem', background: '#4caf50'}}>
            {showDirectForm ? 'Close Form' : '+ New Walk-in Booking'}
          </button>
        </div>
        
        {showDirectForm && (
          <form onSubmit={handleDirectBooking} style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem'}}>
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
              <div style={{flex: '1 1 200px'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Select Room</label>
                <select required value={directBooking.roomId} onChange={e => setDirectBooking({...directBooking, roomId: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px'}}>
                  <option value="">-- Choose Room --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - ₹{r.price}/night</option>
                  ))}
                </select>
              </div>
              <div style={{flex: '1 1 200px'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Guest Name</label>
                <input type="text" required value={directBooking.guestName} onChange={e => setDirectBooking({...directBooking, guestName: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px'}} />
              </div>
              <div style={{flex: '1 1 200px'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Phone</label>
                <input type="tel" required value={directBooking.guestPhone} onChange={e => setDirectBooking({...directBooking, guestPhone: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px'}} />
              </div>
            </div>
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
              <div style={{flex: '1 1 150px'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Check In</label>
                <input type="date" required value={directBooking.checkIn} onChange={e => setDirectBooking({...directBooking, checkIn: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px'}} />
              </div>
              <div style={{flex: '1 1 150px'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Check Out</label>
                <input type="date" required value={directBooking.checkOut} onChange={e => setDirectBooking({...directBooking, checkOut: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px'}} />
              </div>
              <div style={{flex: '1 1 100px'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Guests</label>
                <input type="number" min="1" required value={directBooking.guestCount} onChange={e => setDirectBooking({...directBooking, guestCount: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px'}} />
              </div>
              <div style={{flex: '1 1 150px'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Amount Received (₹)</label>
                <input type="number" min="0" required value={directBooking.amount} onChange={e => setDirectBooking({...directBooking, amount: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px'}} />
              </div>
              <div style={{flex: '1 1 150px'}}>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Payment Mode</label>
                <select value={directBooking.paymentType} onChange={e => setDirectBooking({...directBooking, paymentType: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px'}}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            <div style={{background: '#2a2a2a', padding: '1rem', borderRadius: '8px', border: '1px solid #444', marginTop: '1rem'}}>
              <h4 style={{marginBottom: '0.5rem'}}>Upload Aadhar Cards</h4>
              <p style={{fontSize: '0.85rem', color: '#aaa', marginBottom: '1rem'}}>
                You can upload multiple images. Use the camera button to take a live photo, or the gallery button to select existing photos.
              </p>
              
              <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                <label className="btn btn-outline" style={{cursor: 'pointer', flex: 1, textAlign: 'center'}}>
                  📸 Take Photo (Camera)
                  <input type="file" accept="image/*" capture="environment" onChange={handleAadharUpload} style={{display: 'none'}} />
                </label>
                <label className="btn btn-outline" style={{cursor: 'pointer', flex: 1, textAlign: 'center'}}>
                  🖼️ Choose from Gallery
                  <input type="file" accept="image/*" multiple onChange={handleAadharUpload} style={{display: 'none'}} />
                </label>
              </div>

              {directBooking.aadharCards.length > 0 && (
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem'}}>
                  {directBooking.aadharCards.map((base64, index) => (
                    <div key={index} style={{position: 'relative', width: '100px', height: '100px'}}>
                      <img src={base64} alt={`Aadhar ${index + 1}`} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #555'}} />
                      <button 
                        type="button" 
                        onClick={() => removeAadhar(index)} 
                        style={{position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '0.7rem'}}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={directLoading} className="btn btn-primary" style={{background: '#4caf50', marginTop: '0.5rem'}}>
              {directLoading ? 'Creating...' : '✅ Confirm Walk-in Booking'}
            </button>
          </form>
        )}
      </div>

      <div style={{maxWidth: '1000px', margin: '0 auto 2rem auto', background: '#1a1a1a', padding: '2rem', borderRadius: '8px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h3 style={{color: 'var(--primary-color)'}}>User Management (Admins)</h3>
          <div style={{background: '#333', padding: '0.5rem 1rem', borderRadius: '4px'}}>
            Total Website Visits: <strong style={{color: 'var(--primary-color)'}}>{totalVisits}</strong>
          </div>
        </div>
        {usersLoading ? <p>Loading users...</p> : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
              <thead>
                <tr style={{borderBottom: '1px solid #333'}}>
                  <th style={{padding: '1rem 0'}}>ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{borderBottom: '1px solid #333'}}>
                    <td style={{padding: '1rem 0'}}>#{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.mobile || '-'}</td>
                    <td>{u.email}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem',
                        background: u.role === 'admin' ? '#4caf50' : '#444',
                        color: '#fff'
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {u.id !== JSON.parse(localStorage.getItem('user') || '{}').id ? (
                        <button 
                          onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                          className="btn"
                          style={{
                            padding: '0.4rem 0.8rem', 
                            fontSize: '0.8rem',
                            background: u.role === 'admin' ? '#f44336' : '#2196f3',
                            border: 'none',
                            color: 'white'
                          }}
                        >
                          {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                      ) : (
                        <span style={{color: '#888', fontSize: '0.8rem'}}>You (Current)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

      <div style={{maxWidth: '1000px', margin: '0 auto 2rem auto', background: '#1a1a1a', padding: '2rem', borderRadius: '8px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h3 style={{color: 'var(--primary-color)'}}>Channel Manager (OTA Sync)</h3>
          <button onClick={handleSync} disabled={syncLoading} className="btn btn-primary" style={{padding: '0.5rem 1rem'}}>
            {syncLoading ? 'Syncing...' : 'Sync Now with OTAs'}
          </button>
        </div>
        <p style={{marginBottom: '2rem', fontSize: '0.9rem', color: '#ccc'}}>
          Export calendars to lock dates on Airbnb/Booking.com. Import their iCal links here (one per line) to lock dates on this website.
        </p>

        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          {rooms.map(room => {
            const currentLinks = JSON.parse(room.icalLinks || '{}');
            const linksObj = Array.isArray(currentLinks) ? {} : currentLinks;
            const exportUrl = `${window.location.origin}/api/ical/export/${room.id}`;
            
            return (
              <div key={room.id} style={{background: '#222', padding: '1.5rem', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '2rem'}}>
                <div style={{flex: '1 1 300px'}}>
                  <h4 style={{marginBottom: '0.5rem'}}>{room.name}</h4>
                  <p style={{fontSize: '0.85rem', marginBottom: '0.5rem', color: '#4fc3f7'}}>Export Link (Paste in Airbnb/Booking):</p>
                  <input type="text" readOnly value={exportUrl} onClick={(e) => {e.target.select(); navigator.clipboard.writeText(exportUrl); alert('Link copied!');}} style={{width: '100%', padding: '0.5rem', background: '#111', color: '#fff', border: '1px solid #333', cursor: 'pointer', borderRadius: '4px', marginBottom: '1rem'}} />
                </div>
                <div style={{flex: '1 1 300px'}}>
                  <p style={{fontSize: '0.85rem', marginBottom: '0.5rem', color: '#ffb300'}}>Import iCal Links (from OTAs):</p>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleIcalSave(room.id, {
                      airbnb: e.target.airbnb.value,
                      booking: e.target.booking.value,
                      agoda: e.target.agoda.value,
                      goibibo: e.target.goibibo.value
                    });
                  }} style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                    <input name="airbnb" defaultValue={linksObj.airbnb || ''} placeholder="Airbnb iCal Link" style={{width: '100%', padding: '0.5rem', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '4px'}} />
                    <input name="booking" defaultValue={linksObj.booking || ''} placeholder="Booking.com iCal Link" style={{width: '100%', padding: '0.5rem', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '4px'}} />
                    <input name="agoda" defaultValue={linksObj.agoda || ''} placeholder="Agoda iCal Link" style={{width: '100%', padding: '0.5rem', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '4px'}} />
                    <input name="goibibo" defaultValue={linksObj.goibibo || ''} placeholder="Goibibo/MakeMyTrip iCal Link" style={{width: '100%', padding: '0.5rem', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '4px'}} />
                    <button type="submit" className="btn btn-primary" style={{marginTop: '0.5rem', padding: '0.5rem'}}>Save Links for {room.name}</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{maxWidth: '1000px', margin: '0 auto', background: '#1a1a1a', padding: '2rem', borderRadius: '8px'}}>
        <h3 style={{marginBottom: '1.5rem', color: 'var(--primary-color)'}}>All Bookings</h3>
        
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '1px solid #333'}}>
                <th style={{padding: '1rem'}}>Ref</th>
                <th style={{padding: '1rem'}}>User / Platform</th>
                <th style={{padding: '1rem'}}>Dates</th>
                <th style={{padding: '1rem'}}>Room</th>
                <th style={{padding: '1rem'}}>Amount</th>
                <th style={{padding: '1rem'}}>Proof</th>
                <th style={{padding: '1rem'}}>Status</th>
                <th style={{padding: '1rem'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} style={{borderBottom: '1px solid #222', background: b.status === 'external' ? 'rgba(100, 100, 255, 0.05)' : 'transparent'}}>
                  <td style={{padding: '1rem'}}>{b.refCode}</td>
                  <td style={{padding: '1rem', fontSize: '0.9rem'}}>
                    {b.status === 'external' ? (
                      <span style={{
                        background: b.guestDetails?.platform === 'Airbnb' ? '#FF5A5F'
                                  : b.guestDetails?.platform === 'Booking.com' ? '#003580'
                                  : b.guestDetails?.platform === 'Agoda' ? '#e43d30'
                                  : b.guestDetails?.platform === 'Goibibo/MMT' ? '#f26522'
                                  : '#555',
                        color: '#fff',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}>
                        {b.guestDetails?.platform || 'OTA'}
                      </span>
                    ) : (
                      <div>
                        <strong>Name:</strong> {b.guestDetails?.name || b.userName}<br/>
                        <strong>Mobile:</strong> {b.guestDetails?.phone || b.userMobile || 'N/A'}<br/>
                        <span style={{color: '#aaa', fontSize: '0.8rem'}}>{b.userEmail}</span>
                      </div>
                    )}
                  </td>
                  <td style={{padding: '1rem', fontSize: '0.9rem', whiteSpace: 'nowrap'}}>
                    <strong>In:</strong> {b.checkIn}<br/>
                    <strong>Out:</strong> {b.checkOut}
                  </td>
                  <td style={{padding: '1rem'}}>{b.roomName}</td>
                  <td style={{padding: '1rem'}}>₹{b.amount}</td>
                  <td style={{padding: '1rem'}}>
                    {b.paymentProof ? (
                      b.paymentProof.startsWith('data:image') 
                        ? <a href={b.paymentProof} target="_blank" rel="noreferrer" style={{color: '#4fc3f7'}}>View Proof</a>
                        : <a href={`http://localhost:5000${b.paymentProof}`} target="_blank" rel="noreferrer" style={{color: '#4fc3f7'}}>View Proof</a>
                    ) : 'None'}
                    
                    {b.aadharCards && (
                      <div style={{marginTop: '0.5rem'}}>
                        <button 
                          onClick={() => {
                            try {
                              setSelectedAadhars(JSON.parse(b.aadharCards));
                            } catch(e) {
                              alert("No valid Aadhar cards found");
                            }
                          }}
                          className="btn"
                          style={{padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#f57c00', border: 'none', color: '#fff'}}
                        >
                          View IDs
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{padding: '1rem', fontWeight: 'bold'}}>
                    <span style={{color: b.status === 'cancel_request' ? '#ff9800' : (b.status === 'cancelled' ? '#ff5252' : '#fff')}}>
                      {b.status}
                    </span>
                    {b.status === 'cancel_request' && (
                      <div style={{fontSize: '0.8rem', marginTop: '0.5rem', color: '#ff9800', background: 'rgba(255, 152, 0, 0.1)', padding: '0.5rem', borderRadius: '4px'}}>
                        <strong>Reason:</strong> {b.guestDetails?.cancelReason || 'No reason provided'}
                      </div>
                    )}
                  </td>
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

      {selectedAadhars && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'}}>
          <div style={{background: '#222', padding: '2rem', borderRadius: '8px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative'}}>
            <button onClick={() => setSelectedAadhars(null)} style={{position: 'absolute', top: '10px', right: '10px', background: 'red', color: 'white', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px'}}>
              Close
            </button>
            <h3 style={{marginBottom: '1rem'}}>Uploaded Aadhar Cards</h3>
            {Array.isArray(selectedAadhars) && selectedAadhars.length > 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {selectedAadhars.map((base64Str, i) => (
                  <div key={i} style={{border: '1px solid #444', padding: '1rem', borderRadius: '4px'}}>
                    <h4 style={{marginBottom: '0.5rem'}}>Aadhar {i + 1}</h4>
                    <img src={base64Str} alt={`Aadhar ${i+1}`} style={{maxWidth: '100%', height: 'auto', borderRadius: '4px'}} />
                  </div>
                ))}
              </div>
            ) : (
              <p>No Aadhar cards uploaded for this booking.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default Admin;
