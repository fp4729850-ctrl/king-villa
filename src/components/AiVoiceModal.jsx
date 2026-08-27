import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function AiVoiceModal({ onClose, onBookingSuccess, rooms }) {
  const [history, setHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // Hindi (can handle Hinglish/English mixed)
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleUserSpeech(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleUserSpeech = async (text) => {
    const newHistory = [...history, { role: 'user', content: text }];
    setHistory(newHistory);
    setLoading(true);

    try {
      const res = await axios.post('/api/ai/booking', { history: newHistory }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.data.ready) {
        const intent = res.data.data.intent;
        if (intent === 'block') {
          setHistory(prev => [...prev, { role: 'model', content: "Room ko successfully block kiya jaa raha hai..." }]);
          speak("Room ko successfully block kiya jaa raha hai.");
        } else {
          setHistory(prev => [...prev, { role: 'model', content: "Mubarak ho! Aapki details complete hain. Main booking save kar raha hoon..." }]);
          speak("Mubarak ho! Aapki details complete hain. Main booking save kar raha hoon.");
        }
        
        // Save the bookings
        const bookingsToSave = res.data.data.bookings;
        for (const b of bookingsToSave) {
          await axios.post('/api/bookings/admin-direct', {
            roomId: b.roomId,
            guestName: intent === 'block' ? 'Blocked by Admin' : 'Walk-in (AI)',
            guestPhone: 'NA',
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guestCount: b.guests || 1,
            amount: b.amount || 0,
            paymentType: 'cash',
            aadharCards: []
          }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        }
        
        setTimeout(() => {
          onBookingSuccess();
          onClose();
        }, 3000);

      } else {
        // Needs more info
        const aiText = res.data.text;
        setHistory(prev => [...prev, { role: 'model', content: aiText }]);
        speak(aiText);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "Sorry, koi error aa gaya hai.";
      setHistory(prev => [...prev, { role: 'model', content: errMsg }]);
      speak("Sorry, kuch error aa gaya hai.");
    } finally {
      setLoading(false);
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#1a1a1a', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
          <h3 style={{color: '#4caf50'}}>🎙️ AI Voice Assistant</h3>
          <button onClick={onClose} style={{background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer'}}>×</button>
        </div>

        <div style={{flex: 1, overflowY: 'auto', border: '1px solid #333', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {history.length === 0 && (
            <p style={{color: '#888', textAlign: 'center', marginTop: '2rem'}}>
              Start speaking to book a room. For example: <br/><br/>
              <i>"Kal room number 1 book karna hai"</i>
            </p>
          )}
          {history.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#4caf50' : '#333',
              color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', maxWidth: '80%'
            }}>
              {msg.content}
            </div>
          ))}
          {loading && <div style={{color: '#888'}}>AI is thinking...</div>}
        </div>

        <div style={{display: 'flex', justifyContent: 'center'}}>
          {!(window.SpeechRecognition || window.webkitSpeechRecognition) ? (
            <p style={{color: 'red'}}>Speech Recognition not supported in this browser.</p>
          ) : (
            <button 
              onClick={toggleListen} 
              disabled={loading}
              style={{
                background: isListening ? '#f44336' : '#4caf50',
                color: 'white', padding: '1rem 2rem', border: 'none', borderRadius: '50px',
                fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
              }}
            >
              {isListening ? '🛑 Stop Listening' : '🎤 Tap to Speak'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
