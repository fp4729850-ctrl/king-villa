const router = require('express').Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { adminAuth } = require('./auth');
const db = require('../db');

router.post('/booking', adminAuth, async (req, res) => {
  try {
    const { history } = req.body;
    // history is an array: [{role: 'user', content: '...'}, {role: 'model', content: '...'}]
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server. Please add it to Vercel and your .env file.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const roomsRes = await db.query('SELECT id, name, "isEntireVilla" FROM rooms');
    const roomsStr = JSON.stringify(roomsRes.rows);

    const existingBookingsRes = await db.query(`
      SELECT "roomId", "checkIn", "checkOut"
      FROM bookings 
      WHERE status != 'cancelled'
    `);
    const existingBookingsStr = JSON.stringify(existingBookingsRes.rows);

    // Pre-compute a human-readable blocked list so AI cannot hallucinate
    const allRooms = roomsRes.rows;
    const blockedRoomsList = existingBookingsRes.rows.map(b => {
      const room = allRooms.find(r => r.id === parseInt(b.roomId));
      return `- ${room?.name || 'Room ' + b.roomId} (ID: ${b.roomId}): ${b.checkIn} se ${b.checkOut} tak BLOCKED hai`;
    }).join('\n');
    const entireVillaRooms = allRooms.filter(r => r.isEntireVilla).map(r => r.id);

    const systemInstruction = `
You are a helpful hotel booking AI assistant for King Villa. 
You communicate with the user in conversational Hindi (written in English alphabet/Hinglish).
The user is a Hotel Admin. They can either BOOK a room or BLOCK a room.

Available Rooms: ${roomsStr}
Today's date: ${new Date().toISOString().split('T')[0]} (IST). 'Kal' means tomorrow.

For a NORMAL BOOKING, you need 5 pieces of info:
1. Room ID(s)
2. Check-in Date (Format YYYY-MM-DD)
3. Check-out Date (Format YYYY-MM-DD)
4. Number of Guests (Integer)
5. Amount Received (Integer in Rupees)

For BLOCKING A ROOM, you only need:
1. Room ID(s), 2. Check-in Date, 3. Check-out Date

=== BLOCKED DATES (DO NOT BOOK THESE) ===
The following rooms are ALREADY BOOKED. You MUST NEVER confirm a booking for these rooms on these dates:
${blockedRoomsList || 'Koi booking nahi hai abhi.'}
Entire Villa room IDs: ${JSON.stringify(entireVillaRooms)} — agar ye booked hai toh baaki sab rooms bhi unavailable hain.
=========================================

If the user asks to book a room that appears in the BLOCKED DATES list above, you MUST say in Hinglish that the room is already booked and suggest other dates or rooms. NEVER output JSON for a blocked room.

If information is missing, ask a friendly question in Hinglish. DO NOT output JSON if info is missing.

If all required info is present and the room is NOT blocked, output ONLY a JSON object:
For BOOKING:
{
  "ready": true,
  "intent": "booking",
  "bookings": [
    { "roomId": 1, "checkIn": "2026-08-27", "checkOut": "2026-08-28", "guests": 4, "amount": 5000 }
  ]
}

For BLOCKING:
{
  "ready": true,
  "intent": "block",
  "bookings": [
    { "roomId": 1, "checkIn": "2026-08-27", "checkOut": "2026-08-28" }
  ]
}
Output ONLY valid JSON if ready. If not, output text.
`;

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemInstruction }]
        },
        {
          role: "model",
          parts: [{ text: "Understood. I will ask questions in Hinglish until I have all 5 pieces of info, and then output JSON." }]
        },
        ...history.slice(0, -1).map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        }))
      ]
    });

    const lastMessage = history[history.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text().trim();

    try {
      let cleanText = responseText;
      const match = responseText.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/);
      if (match) {
        cleanText = match[1];
      } else {
        const braceMatch = responseText.match(/\\{[\\s\\S]*\\}/);
        if (braceMatch) cleanText = braceMatch[0];
      }
      
      const parsed = JSON.parse(cleanText.trim());
      if (parsed.ready) {
        let overlap = false;
        let overlapRoomId = null;
        
        const reqBookings = parsed.bookings || [];
        for (const reqBooking of reqBookings) {
          const reqIn = new Date(reqBooking.checkIn).getTime();
          const reqOut = new Date(reqBooking.checkOut).getTime();
          
          for (const extBooking of existingBookingsRes.rows) {
            const extIn = new Date(extBooking.checkIn).getTime();
            const extOut = new Date(extBooking.checkOut).getTime();
            
            if (reqIn < extOut && reqOut > extIn) {
              const reqRoomId = parseInt(reqBooking.roomId);
              const extRoomId = parseInt(extBooking.roomId);
              const reqRoom = roomsRes.rows.find(r => r.id === reqRoomId);
              const extRoom = roomsRes.rows.find(r => r.id === extRoomId);
              
              if (reqRoomId === extRoomId || reqRoom?.isEntireVilla || extRoom?.isEntireVilla) {
                overlap = true;
                overlapRoomId = reqRoomId;
                break;
              }
            }
          }
          if (overlap) break;
        }

        if (overlap) {
          return res.json({ ready: false, text: `Maaf kijiye, Room ${overlapRoomId} in dates par pehle se booked hai. Kya main kisi aur room ya date ke liye check karoon?` });
        }

        return res.json({ ready: true, data: parsed });
      }
    } catch (e) {
      // Not JSON, return text
      return res.json({ ready: false, text: responseText });
    }

    res.json({ ready: false, text: responseText });
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

router.post('/customer-booking', async (req, res) => {
  try {
    const { history } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    const roomsRes = await db.query('SELECT id, name, price, "isEntireVilla" FROM rooms');
    const roomsStr = JSON.stringify(roomsRes.rows);

    const existingBookingsRes = await db.query(`
      SELECT "roomId", "checkIn", "checkOut"
      FROM bookings 
      WHERE status != 'cancelled'
    `);
    const existingBookingsStr = JSON.stringify(existingBookingsRes.rows);

    // Pre-compute a human-readable blocked list so AI cannot hallucinate
    const allRooms = roomsRes.rows;
    const blockedRoomsList = existingBookingsRes.rows.map(b => {
      const room = allRooms.find(r => r.id === parseInt(b.roomId));
      return `- ${room?.name || 'Room ' + b.roomId} (ID: ${b.roomId}): ${b.checkIn} se ${b.checkOut} tak BOOKED hai`;
    }).join('\n');
    const entireVillaRooms = allRooms.filter(r => r.isEntireVilla).map(r => r.id);

    const systemInstruction = `
You are a helpful hotel booking AI assistant for King Villa. 
You communicate with the user (the customer) in conversational Hindi (written in English alphabet/Hinglish).
Your goal is to help the customer book a room. You CANNOT block rooms, only book them.

Available Rooms: ${roomsStr}
Today's date: ${new Date().toISOString().split('T')[0]} (IST).

To create a booking, you must extract 5 pieces of information:
1. Room preference
2. Check-in Date (Format YYYY-MM-DD)
3. Check-out Date (Format YYYY-MM-DD)
4. Number of Guests
5. Customer Name & Phone Number

=== BOOKED DATES (UNAVAILABLE) ===
The following rooms are ALREADY BOOKED. You MUST NEVER confirm a booking for these rooms on these dates:
${blockedRoomsList || 'Koi booking nahi hai abhi.'}
Entire Villa room IDs: ${JSON.stringify(entireVillaRooms)} — agar ye booked hai toh baaki sab rooms bhi unavailable hain.
==================================

If the customer asks for a room that appears in the BOOKED DATES list above, you MUST politely say it is unavailable and suggest other dates or a different room. NEVER output JSON for a booked room.

If ANY info is missing, politely ask the customer for it. DO NOT output JSON.

Once ALL 5 pieces of info are provided and the room is NOT booked, calculate the total price and output ONLY this JSON:
{
  "ready": true,
  "details": {
    "roomId": 1,
    "checkIn": "2026-08-27",
    "checkOut": "2026-08-28",
    "guests": 2,
    "name": "Rahul",
    "phone": "9876543210",
    "amount": 5000
  }
}
Output ONLY JSON if ready. If not, output text.
`;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemInstruction }] },
        { role: "model", parts: [{ text: "Understood. I will help the customer." }] },
        ...history.slice(0, -1).map(msg => ({ role: msg.role, parts: [{ text: msg.content }] }))
      ]
    });

    const lastMessage = history[history.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text().trim();

    try {
      let cleanText = responseText;
      const match = responseText.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/);
      if (match) {
        cleanText = match[1];
      } else {
        const braceMatch = responseText.match(/\\{[\\s\\S]*\\}/);
        if (braceMatch) cleanText = braceMatch[0];
      }
      
      const parsed = JSON.parse(cleanText.trim());
      if (parsed.ready) {
        let overlap = false;
        let overlapRoomId = null;
        
        const reqBookings = parsed.details ? [parsed.details] : [];
        for (const reqBooking of reqBookings) {
          const reqIn = new Date(reqBooking.checkIn).getTime();
          const reqOut = new Date(reqBooking.checkOut).getTime();
          
          for (const extBooking of existingBookingsRes.rows) {
            const extIn = new Date(extBooking.checkIn).getTime();
            const extOut = new Date(extBooking.checkOut).getTime();
            
            if (reqIn < extOut && reqOut > extIn) {
              const reqRoomId = parseInt(reqBooking.roomId);
              const extRoomId = parseInt(extBooking.roomId);
              const reqRoom = roomsRes.rows.find(r => r.id === reqRoomId);
              const extRoom = roomsRes.rows.find(r => r.id === extRoomId);
              
              if (reqRoomId === extRoomId || reqRoom?.isEntireVilla || extRoom?.isEntireVilla) {
                overlap = true;
                overlapRoomId = reqRoomId;
                break;
              }
            }
          }
          if (overlap) break;
        }

        if (overlap) {
          return res.json({ ready: false, text: `Maaf kijiye, Room ${overlapRoomId} in dates par pehle se booked hai. Kya main kisi aur room ya date ke liye check karoon?` });
        }

        return res.json({ ready: true, data: parsed });
      }
    } catch (e) {
      return res.json({ ready: false, text: responseText });
    }
    res.json({ ready: false, text: responseText });
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ error: err.message });
  }
});

