# King Villa 👑

A luxurious hotel booking and management website built with React, Vite, Express, and PostgreSQL.

## 🚀 Live Demo
Website is deployed on Vercel: [https://king-villa.vercel.app/](https://king-villa.vercel.app/)

## 🛠 Tech Stack
- **Frontend:** React, Vite, Vanilla CSS
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (Hosted on [Neon](https://neon.tech))
- **Deployment:** Vercel

## 🗄️ Database Information (Important)
The data for this website (Rooms, Bookings, Users, and Settings) is **NOT** saved locally or on Vercel. 
All data is permanently saved and hosted on **Neon PostgreSQL (neon.tech)**.

If you ever need to access the raw data or make manual database changes, you need to log in to your **Neon** account.

### Environment Variables required for Local Development
To run this project locally, create a `.env` file in the root folder with your Neon connection string:
```
DATABASE_URL=postgresql://[user]:[password]@[neon-host]/neondb?sslmode=require
```

## 🏃‍♂️ How to Run Locally
1. Clone the repository
2. Run `npm install`
3. Add the `.env` file with your `DATABASE_URL`
4. Run `npm run dev` to start both frontend and backend concurrently.
