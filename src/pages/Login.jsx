import React, { useState } from 'react';
import axios from 'axios';

function Login() {
  const [formData, setFormData] = useState({ email: 'admin@kingvilla.com', password: 'password123', name: 'Admin' });
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    axios.post(endpoint, formData)
      .then(res => {
        if(res.data.token) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          alert('Logged in successfully!');
          window.location.href = '/';
        } else {
          alert('Registered successfully. Please login.');
          setIsLogin(true);
        }
      })
      .catch(err => {
        console.error(err);
        alert(err.response?.data?.error || 'Authentication failed');
      });
  };

  return (
    <section className="rooms-section" style={{paddingTop: '8rem', minHeight: '100vh'}}>
      <div className="section-header">
        <h3 className="section-subtitle">AUTHENTICATION</h3>
        <h2 className="section-title">{isLogin ? 'Login' : 'Register'}</h2>
      </div>

      <div style={{maxWidth: '400px', margin: '0 auto', background: '#1a1a1a', padding: '2rem', borderRadius: '8px'}}>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {!isLogin && (
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px'}} />
            </div>
          )}
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Email</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px'}} />
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Password</label>
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{width: '100%', padding: '0.8rem', background: '#333', border: '1px solid #444', color: '#fff', borderRadius: '4px'}} />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{marginTop: '1rem'}}>
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <div style={{marginTop: '1rem', textAlign: 'center'}}>
          <button onClick={() => setIsLogin(!isLogin)} style={{background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline'}}>
            {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default Login;
