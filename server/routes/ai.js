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

    const roomsRes = await db.query('SELECT id, name FROM rooms');
    const roomsStr = JSON.stringify(roomsRes.rows);

    const existingBookingsRes = await db.query('SELECT "roomId", "checkIn", "checkOut" FROM bookings WHERE status != $1', ['cancelled']);
    const existingBookingsStr = JSON.stringify(existingBookingsRes.rows);

    const systemInstruction = `
You are a helpful hotel booking AI assistant for King Villa. 
You communicate with the user in conversational Hindi (written in English alphabet/Hinglish).
The user is a Hotel Admin. They can either BOOK a room or BLOCK a room.

For a NORMAL BOOKING, you need 5 pieces of info:
1. Room ID(s): (Map to IDs: ${roomsStr})
2. Check-in Date: (Format YYYY-MM-DD. Today is ${new Date().toISOString().split('T')[0]}). 'Kal'=tomorrow.
3. Check-out Date: (Format YYYY-MM-DD).
4. Number of Guests (Integer).
5. Amount Received (Integer in Rupees).

For BLOCKING A ROOM (e.g., "room 1 ko block kardo"), you only need:
1. Room ID(s)
2. Check-in Date
3. Check-out Date

CRITICAL AVAILABILITY CHECK:
Here is a list of existing booked dates: ${existingBookingsStr}
Before confirming ANY booking or block, you MUST check if the requested room is already booked on the requested dates. A room is unavailable if the requested [check-in, check-out) date range overlaps with an existing booking's [checkIn, checkOut) for that roomId. 
If the room is already booked, you MUST politely reject the request in Hinglish, state that the room is already booked on those dates. DO NOT output JSON in this case.

If information is missing, ask a friendly question in Hinglish. DO NOT output JSON if info is missing.

If all required info is present and the room is available, output ONLY a JSON object:
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
      if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
      
      const parsed = JSON.parse(cleanText.trim());
      if (parsed.ready) {
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

    const roomsRes = await db.query('SELECT id, name, price FROM rooms');
    const roomsStr = JSON.stringify(roomsRes.rows);

    const existingBookingsRes = await db.query('SELECT "roomId", "checkIn", "checkOut" FROM bookings WHERE status != $1', ['cancelled']);
    const existingBookingsStr = JSON.stringify(existingBookingsRes.rows);

    const systemInstruction = `
You are a helpful hotel booking AI assistant for King Villa. 
You communicate with the user (the customer) in conversational Hindi (written in English alphabet/Hinglish).
Your goal is to help the customer book a room. You CANNOT block rooms, only book them.

To create a booking, you must extract 5 pieces of information:
1. Room preference (Map to IDs: ${roomsStr})
2. Check-in Date (Format YYYY-MM-DD. Today is ${new Date().toISOString().split('T')[0]})
3. Check-out Date (Format YYYY-MM-DD)
4. Number of Guests
5. Customer Name & Phone Number (Ask them to speak their name and phone number)

CRITICAL AVAILABILITY CHECK:
Existing booked dates: ${existingBookingsStr}
If the requested room is already booked on those dates, politely tell the customer it is unavailable and suggest different dates or another room. DO NOT output JSON.

If ANY info is missing, politely ask the customer for it. DO NOT output JSON.

Once ALL 5 pieces of info are provided and the room is available, calculate the total price based on the room price and nights, and output ONLY this JSON:
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
      if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
      
      const parsed = JSON.parse(cleanText.trim());
      if (parsed.ready) {
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

