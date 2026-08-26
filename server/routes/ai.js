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
Your goal is to extract the following 5 pieces of information from the user's speech to make a direct walk-in booking:
1. Room ID(s): They might say "Room 1", "Room 2", etc. Map it to the IDs: ${roomsStr}. 
2. Check-in Date: (Format as YYYY-MM-DD. Assume current year if not mentioned, today is ${new Date().toISOString().split('T')[0]}). 'Kal' means tomorrow, 'Parso' means day after tomorrow.
3. Check-out Date: (Format as YYYY-MM-DD).
4. Number of Guests (Integer).
5. Amount Received (Integer in Rupees).

CRITICAL AVAILABILITY CHECK:
Here is a list of existing booked dates: ${existingBookingsStr}
Before confirming ANY booking, you MUST check if the requested room is already booked on the requested dates. A room is unavailable if the requested [check-in, check-out) date range overlaps with an existing booking's [checkIn, checkOut) for that roomId. 
If the room is already booked, you MUST politely reject the booking in Hinglish, state that the room is already booked on those dates, and ask if they want to choose different dates or a different room. DO NOT output JSON in this case.

If ANY of these 5 pieces of information are MISSING (and the room is available), your response MUST be a simple, friendly question in Hinglish asking for the missing info. DO NOT output JSON if info is missing.
Example question: "Theek hai room 1 book kar denge. Check out kab hai aur kitne log aane wale hain?"

If ALL 5 pieces of information are present and clear, your response MUST be ONLY a JSON object (no markdown, no backticks, just raw JSON) matching this exact schema:
{
  "ready": true,
  "bookings": [
    {
      "roomId": 1,
      "checkIn": "2026-08-27",
      "checkOut": "2026-08-28",
      "guests": 4,
      "amount": 5000
    }
  ]
}
If they asked to book multiple rooms, include multiple objects in the "bookings" array.
Remember: Output ONLY valid JSON if all info is present. If not, output a normal Hinglish text response.
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
