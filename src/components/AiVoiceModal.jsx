import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

export default function AiVoiceModal({ onClose, onBookingSuccess, rooms }) {
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const transcriptBufferRef = useRef('');
  const isListeningRef = useRef(false);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = false; // Auto-stop when user pauses
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let newText = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          newText += event.results[i][0].transcript + ' ';
        }
      }
      if (newText.trim()) {
        transcriptBufferRef.current += newText;
      }
    };

    recognition.onend = () => {
      const finalText = transcriptBufferRef.current.trim();
      if (finalText) {
        // We have speech! Process it and stop listening.
        transcriptBufferRef.current = '';
        isListeningRef.current = false;
        setIsListening(false);
        handleUserSpeech(finalText);
      } else if (isListeningRef.current) {
        // No speech yet, but user still wants to listen, so restart
        try {
          recognitionRef.current?.start();
        } catch (e) {}
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow microphone access.');
        isListeningRef.current = false;
        setIsListening(false);
      }
    };

    return recognition;
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    transcriptBufferRef.current = '';
    
    const recognition = createRecognition();
    if (!recognition) return;
    
    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setIsListening(true);
    
    try {
      recognition.start();
    } catch (e) {
      console.error('Could not start recognition:', e);
    }
  };

  const handleUserSpeech = async (text) => {
    if (!text) return;
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
        const successMsg = intent === 'block'
          ? 'Room ko successfully block kiya jaa raha hai...'
          : 'Mubarak ho! Booking save kar raha hoon...';
        
        setHistory(prev => [...prev, { role: 'model', content: successMsg }]);
        speak(successMsg, false);

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
        // After AI speaks, auto-restart listening
        speak(aiText, true);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Sorry, koi error aa gaya hai.';
      setHistory(prev => [...prev, { role: 'model', content: errMsg }]);
      speak('Sorry, kuch error aa gaya hai.', true);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text, resumeListeningAfter = false) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.lang.includes('hi') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')))
        || voices.find(v => v.lang.includes('hi'));
      if (bestVoice) utterance.voice = bestVoice;

      utterance.onend = () => {
        setIsSpeaking(false);
        if (resumeListeningAfter) {
          startListening();
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        if (resumeListeningAfter) {
          startListening();
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      if (resumeListeningAfter) {
        startListening();
      }
    }
  };

  const toggleListen = () => {
    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      startListening();
    }
  };

  const isButtonDisabled = loading || isSpeaking;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#1a1a1a', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: '#4caf50' }}>🎙️ AI Voice Assistant</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #333', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.length === 0 && (
            <p style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>
              Baat karein room book karne ke liye. Jaise:<br /><br />
              <i>"Kal room number 1 book karna hai"</i><br />
              <i>"Room 2 aur 4 kal se parso tak block karo"</i>
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
          {loading && <div style={{ color: '#888', fontStyle: 'italic' }}>🤔 AI soch raha hai...</div>}
          {isSpeaking && <div style={{ color: '#4fc3f7', fontStyle: 'italic' }}>🔊 AI bol raha hai...</div>}
          {isListening && <div style={{ color: '#ff9800', fontStyle: 'italic' }}>👂 Sun raha hoon... (band karne ke liye dobara tap karein)</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {!(window.SpeechRecognition || window.webkitSpeechRecognition) ? (
            <p style={{ color: 'red' }}>Speech Recognition is browser mein support nahi hai. Chrome use karein.</p>
          ) : (
            <button
              onClick={toggleListen}
              disabled={isButtonDisabled}
              style={{
                background: isListening ? '#f44336' : (isButtonDisabled ? '#555' : '#4caf50'),
                color: 'white', padding: '1rem 2rem', border: 'none', borderRadius: '50px',
                fontSize: '1.1rem', cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'background 0.3s',
                opacity: isButtonDisabled ? 0.7 : 1
              }}
            >
              {loading ? '⏳ Wait karein...' : isSpeaking ? '🔊 AI bol raha hai...' : isListening ? '🛑 Band Karo' : '🎤 Tap to Speak'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
