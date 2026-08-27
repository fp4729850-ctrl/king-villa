import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function AiVoiceModal({ onClose, onBookingSuccess, rooms }) {
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const utteranceRef = useRef(null); // Fix Chrome early onend bug

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // Turn off mic temporarily while processing
        shouldListenRef.current = false; 
        setIsListening(false);
        handleUserSpeech(transcript);
      };

      recognition.onend = () => {
        // If we are supposed to be listening (e.g. paused automatically), restart it
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch (e) {}
        } else {
          setIsListening(false);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        shouldListenRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleUserSpeech = async (text) => {
    const currentHistory = historyRef.current;
    const newHistory = [...currentHistory, { role: 'user', content: text }];
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
          speak("Room ko successfully block kiya jaa raha hai.", false);
        } else {
          setHistory(prev => [...prev, { role: 'model', content: "Mubarak ho! Aapki details complete hain. Main booking save kar raha hoon..." }]);
          speak("Mubarak ho! Aapki details complete hain. Main booking save kar raha hoon.", false);
        }
        
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
        const aiText = res.data.text;
        setHistory(prev => [...prev, { role: 'model', content: aiText }]);
        speak(aiText, true); // true = resume listening after speaking
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
      window.speechSynthesis.cancel(); // Stop ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance; // Prevent GC

      utterance.lang = 'hi-IN';
      utterance.rate = 0.95; // Slightly slower for more natural feel
      utterance.pitch = 1;
      
      // Try to get a high-quality human-like voice (like Google's)
      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.lang.includes('hi') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))) 
                        || voices.find(v => v.lang.includes('hi'));
      
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      
      utterance.onend = () => {
        if (resumeListening) {
          shouldListenRef.current = true;
          setIsListening(true);
          try {
            recognitionRef.current?.start();
          } catch(e) {}
        }
      };
      
      window.speechSynthesis.speak(utterance);
    } else if (resumeListening) {
      // fallback if no speech synthesis
      shouldListenRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch(e) {}
    }
  };

  const toggleListen = () => {
    if (isListening) {
      shouldListenRef.current = false;
      setIsListening(false);
      recognitionRef.current?.stop();
    } else {
      window.speechSynthesis.cancel(); // Mute AI when user interrupts
      shouldListenRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {}
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
