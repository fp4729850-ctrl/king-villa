import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function CustomerAiModal({ onClose, rooms }) {
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Booking flow states
  const [showUploads, setShowUploads] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  
  // File states
  const [aadharBase64, setAadharBase64] = useState([]);
  const [paymentBase64, setPaymentBase64] = useState(null);
  const [uploading, setUploading] = useState(false);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const utteranceRef = useRef(null); 
  const transcriptBufferRef = useRef(''); // Buffer to store speech until manual stop

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.continuous = true; // Keep listening
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let newText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newText += event.results[i][0].transcript + ' ';
          }
        }
        if (newText) {
          transcriptBufferRef.current += newText;
        }
      };

      recognition.onend = () => {
        // If it stopped automatically (due to pause/timeout) but user hasn't clicked stop
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch(e) {}
        } else {
          setIsListening(false);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
          shouldListenRef.current = false;
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleUserSpeech = async (text) => {
    if (!text) return;
    const currentHistory = historyRef.current;
    const newHistory = [...currentHistory, { role: 'user', content: text }];
    setHistory(newHistory);
    setLoading(true);

    try {
      const res = await axios.post('/api/ai/customer-booking', { history: newHistory });

      if (res.data.ready) {
        const bd = res.data.data;
        setBookingDetails(bd);
        
        setHistory(prev => [...prev, { 
          role: 'model', 
          content: `Great! Aapka total amount ₹${bd.amount} hai. Please apna Aadhar aur Payment Receipt upload karein booking confirm karne ke liye.` 
        }]);
        speak("Aapki details mil gayi hain. Aapka total amount hai " + bd.amount + " rupaye. Booking pakki karne ke liye please apna Aadhar card aur payment screenshot upload karein.", false);
        
        setShowUploads(true);
      } else {
        const aiText = res.data.text;
        setHistory(prev => [...prev, { role: 'model', content: aiText }]);
        speak(aiText, true);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Sorry, koi error aa gaya hai.";
      setHistory(prev => [...prev, { role: 'model', content: errMsg }]);
      speak("Sorry, kuch error aa gaya hai.", true);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text, resumeListening = false) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance; 

      utterance.lang = 'hi-IN';
      utterance.rate = 0.95; 
      utterance.pitch = 1;
      
      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.lang.includes('hi') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))) 
                        || voices.find(v => v.lang.includes('hi'));
      
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      
      utterance.onend = () => {
        if (resumeListening) {
          transcriptBufferRef.current = '';
          shouldListenRef.current = true;
          setIsListening(true);
          try {
            recognitionRef.current?.start();
          } catch(e) {}
        }
      };
      
      window.speechSynthesis.speak(utterance);
    } else if (resumeListening) {
      transcriptBufferRef.current = '';
      shouldListenRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch(e) {}
    }
  };

  const toggleListen = () => {
    if (isListening) {
      // User manually stops listening
      shouldListenRef.current = false;
      setIsListening(false);
      recognitionRef.current?.stop();
      
      const finalSpeech = transcriptBufferRef.current.trim();
      if (finalSpeech) {
        handleUserSpeech(finalSpeech);
      }
      transcriptBufferRef.current = '';
    } else {
      window.speechSynthesis.cancel(); 
      transcriptBufferRef.current = '';
      shouldListenRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    }
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
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
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

  const handleAadharUpload = async (index, file) => {
    if (!file) return;
    const compressed = await compressImage(file);
    const newFiles = [...aadharFiles];
    newFiles[index] = compressed;
    setAadharFiles(newFiles);
  };

  const handlePaymentUpload = async (file) => {
    if (!file) return;
    const compressed = await compressImage(file);
    setPaymentProof(compressed);
  };

  const submitFinalBooking = async () => {
    const requiredAadhars = parseInt(bookingDetails.guests) <= 2 ? parseInt(bookingDetails.guests) : (parseInt(bookingDetails.guests) <= 4 ? 2 : 3);
    const validAadhars = aadharFiles.filter(Boolean);
    
    if (validAadhars.length < requiredAadhars) {
      alert(`Please upload all ${requiredAadhars} required Aadhar cards.`);
      return;
    }
    if (!paymentProof) {
      alert("Please upload payment receipt.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...bookingDetails,
        aadharCards: validAadhars,
        paymentProof: paymentProof
      };
      
      const res = await axios.post('/api/bookings/customer-ai', payload);
      alert('Booking Successfully Confirmed!');
      window.location.href = `/receipt/${res.data.refCode}`; // Redirect to receipt
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Error confirming booking.");
      setSubmitting(false);
    }
  };

  const requiredAadhars = bookingDetails ? (parseInt(bookingDetails.guests) <= 2 ? parseInt(bookingDetails.guests) : (parseInt(bookingDetails.guests) <= 4 ? 2 : 3)) : 0;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div style={{
        background: '#1a1a1a', padding: '2rem', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <h3 style={{color: '#4caf50', margin: 0}}>🎙️ King Villa Voice Booking</h3>
          <button onClick={onClose} style={{background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer'}}>×</button>
        </div>

        <div style={{flex: 1, overflowY: 'auto', border: '1px solid #333', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {history.length === 0 && (
            <p style={{color: '#aaa', textAlign: 'center', marginTop: '2rem', lineHeight: '1.6'}}>
              Hi! Welcome to King Villa. Start speaking to book a room.<br/><br/>
              <b>Tip:</b> Tell me your name, phone number, dates, and guests.<br/>
              <i>"Mera naam Rahul hai, number 9876543210. Kal room book karna hai 2 logo ke liye."</i>
            </p>
          )}
          {history.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#4caf50' : '#333',
              color: '#fff', padding: '0.6rem 1rem', borderRadius: '12px', maxWidth: '85%',
              borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
              borderBottomLeftRadius: msg.role === 'model' ? '2px' : '12px'
            }}>
              {msg.content}
            </div>
          ))}
          {loading && <div style={{color: '#888', fontStyle: 'italic'}}>AI is thinking...</div>}
        </div>

        {!bookingDetails ? (
          <div style={{display: 'flex', justifyContent: 'center'}}>
            {!(window.SpeechRecognition || window.webkitSpeechRecognition) ? (
              <p style={{color: '#f44336'}}>Speech Recognition not supported in this browser.</p>
            ) : (
              <button 
                onClick={toggleListen} 
                disabled={loading}
                style={{
                  background: isListening ? '#f44336' : '#4caf50',
                  color: 'white', padding: '1rem 2rem', border: 'none', borderRadius: '50px',
                  fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                  fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'all 0.3s'
                }}
              >
                {isListening ? '🛑 Stop Listening' : '🎤 Tap to Speak'}
              </button>
            )}
          </div>
        ) : (
          <div style={{background: '#222', padding: '1.5rem', borderRadius: '8px', border: '1px solid #4caf50'}}>
            <h4 style={{color: '#4caf50', marginBottom: '1rem'}}>Complete Your Booking</h4>
            <p style={{color: '#ddd', fontSize: '0.9rem', marginBottom: '1rem'}}>
              Total Amount to Pay: <b>₹{bookingDetails.amount}</b>
            </p>

            <div style={{marginBottom: '1rem'}}>
              <p style={{fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem'}}>1. Upload {requiredAadhars} Aadhar Card(s)</p>
              {Array.from({ length: requiredAadhars }).map((_, index) => (
                <div key={index} style={{marginBottom: '0.5rem', display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <input type="file" accept="image/*" onChange={(e) => handleAadharUpload(index, e.target.files[0])} style={{fontSize: '0.8rem', color: '#fff'}} />
                  {aadharFiles[index] && <span style={{color: '#4caf50', fontSize: '0.8rem'}}>✅</span>}
                </div>
              ))}
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <p style={{fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem'}}>2. Upload Payment Receipt (UPI/Bank Transfer)</p>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <input type="file" accept="image/*" onChange={(e) => handlePaymentUpload(e.target.files[0])} style={{fontSize: '0.8rem', color: '#fff'}} />
                {paymentProof && <span style={{color: '#4caf50', fontSize: '0.8rem'}}>✅</span>}
              </div>
            </div>

            <button 
              onClick={submitFinalBooking}
              disabled={submitting}
              style={{
                width: '100%', background: '#4caf50', color: '#fff', border: 'none', padding: '1rem',
                borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
