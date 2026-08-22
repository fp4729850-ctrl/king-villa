import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

// Helper function to convert numbers to words
function numberToWords(num) {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return; let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() + ' Only';
}

function formatDate(dateString) {
  if(!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays || 1;
}

function Receipt() {
  const { ref } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/bookings/ref/${ref}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => {
      setBooking(res.data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [ref]);

  if (loading) return <div className="rooms-section text-center" style={{paddingTop: '8rem'}}>Loading receipt...</div>;
  if (!booking) return <div className="rooms-section text-center" style={{paddingTop: '8rem'}}>Receipt not found or access denied</div>;

  const g = booking.guestDetails || {};
  const totalAmount = g.totalAmount || booking.amount || 0;
  const advancePaid = g.advancePaid || booking.amount || 0;
  const balanceAmount = g.balanceAmount || (totalAmount - advancePaid);
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const words = numberToWords(totalAmount);

  return (
    <section className="receipt-page-wrapper">
      <div className="receipt-actions no-print">
        <button onClick={() => window.print()} className="btn btn-primary" style={{marginRight: '1rem'}}>Download / Print Receipt</button>
        <Link to="/my-bookings" className="btn btn-outline">Back to My Bookings</Link>
      </div>

      <div className="receipt-container printable-receipt">
        {/* Header */}
        <div className="receipt-header">
          <div className="receipt-logo-area">
            <div className="crown-icon">👑</div>
            <h1 className="receipt-title">KING VILLA</h1>
            <p className="receipt-subtitle">LUXURY STAY, ROYAL COMFORT</p>
          </div>
          <div className="receipt-title-area">
            <h2 className="receipt-main-heading">BOOKING RECEIPT</h2>
            <div className="receipt-meta">
              <div><span className="meta-label">RECEIPT NO.</span>: {booking.refCode}</div>
              <div><span className="meta-label">DATE</span>: {formatDate(new Date().toISOString())}</div>
            </div>
          </div>
        </div>

        {/* Info Blocks */}
        <div className="receipt-info-row">
          <div className="receipt-info-col">
            <div className="info-col-header">GUEST DETAILS</div>
            <table className="info-table">
              <tbody>
                <tr><td>Guest Name</td><td>:</td><td>{g.name}</td></tr>
                <tr><td>Phone No.</td><td>:</td><td>{g.phone}</td></tr>
                <tr><td>Address</td><td>:</td><td>----------------------</td></tr>
              </tbody>
            </table>
          </div>
          <div className="receipt-info-col border-left">
            <div className="info-col-header" style={{background: 'transparent', color: '#000', paddingLeft: 0}}>BOOKING DETAILS</div>
            <table className="info-table">
              <tbody>
                <tr><td>Booking ID</td><td>:</td><td>{booking.refCode}</td></tr>
                <tr><td>Booking Date</td><td>:</td><td>{formatDate(new Date().toISOString())}</td></tr>
                <tr><td>Check-In Date</td><td>:</td><td>{formatDate(booking.checkIn)}</td></tr>
                <tr><td>Check-Out Date</td><td>:</td><td>{formatDate(booking.checkOut)}</td></tr>
                <tr><td>No. of Nights</td><td>:</td><td>{nights} Night{nights > 1 ? 's' : ''}</td></tr>
                <tr><td>No. of Guests</td><td>:</td><td>{g.count} Adults</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing Table */}
        <table className="receipt-pricing-table">
          <thead>
            <tr>
              <th>DESCRIPTION</th>
              <th style={{textAlign: 'right'}}>AMOUNT (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style={{fontWeight: 'bold'}}>{booking.roomName}</div>
                <div style={{fontSize: '0.9rem', color: '#555'}}>{formatDate(booking.checkIn)} to {formatDate(booking.checkOut)} ({nights} Night{nights > 1 ? 's' : ''})</div>
              </td>
              <td style={{textAlign: 'right'}}>{totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Taxes & Charges (Included)</td>
              <td style={{textAlign: 'right'}}>0.00</td>
            </tr>
            <tr className="bg-gold font-bold">
              <td>TOTAL AMOUNT (For {nights} Night{nights > 1 ? 's' : ''})</td>
              <td style={{textAlign: 'right'}}>{totalAmount.toFixed(2)}</td>
            </tr>
            <tr className="bg-light font-bold">
              <td>ADVANCE RECEIVED</td>
              <td style={{textAlign: 'right'}}>{advancePaid.toFixed(2)}</td>
            </tr>
            <tr className="bg-gold font-bold">
              <td>BALANCE AMOUNT</td>
              <td style={{textAlign: 'right'}}>{balanceAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div className="amount-words">
          <strong>Amount in Words:</strong> {words}
        </div>

        {/* Footer Area */}
        <div className="receipt-footer-row">
          <div className="payment-details-box">
            <div className="box-title">PAYMENT DETAILS</div>
            <table className="info-table">
              <tbody>
                <tr><td>Payment Mode</td><td>:</td><td>{booking.status === 'paid' || booking.status === 'confirmed' ? 'Online / UPI' : 'Pending'}</td></tr>
                <tr><td>Payment Date</td><td>:</td><td>{formatDate(new Date().toISOString())}</td></tr>
                <tr><td>Amount Received</td><td>:</td><td>₹ {advancePaid.toFixed(2)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="note-box">
            <div className="box-title" style={{color: '#d4af37'}}>NOTE</div>
            <ul style={{margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#555'}}>
              <li>Remaining balance of ₹ {balanceAmount.toFixed(2)} to be paid at the time of Check-Out.</li>
              <li>This receipt is valid for the above booking only.</li>
              <li>Subject to terms & conditions of King Villa.</li>
            </ul>
          </div>

          <div className="signature-box">
            <p style={{marginBottom: '0.5rem', fontSize: '0.9rem'}}>Thank you for choosing <strong>KING VILLA</strong>.<br/>We look forward to welcoming you.<br/>For any assistance, contact us at<br/><strong>+91 9876543210</strong></p>
            <div style={{fontWeight: 'bold', marginTop: '1rem'}}>Authorized Signature</div>
            <div style={{fontFamily: 'var(--font-serif)', color: '#1a237e', fontSize: '1.5rem', fontStyle: 'italic', marginTop: '0.5rem'}}>King Villa</div>
          </div>
        </div>

        <div className="receipt-thank-you">
          <span style={{color: '#d4af37'}}>❖</span> Thank You! <span style={{color: '#d4af37'}}>❖</span>
        </div>
      </div>
    </section>
  );
}

export default Receipt;
