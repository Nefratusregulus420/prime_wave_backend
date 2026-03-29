# PrimeWave Backend - PostgreSQL Migration

This backend has been migrated from SQLite to PostgreSQL for deployment on Render.

## Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL database (Local or hosted on Render)

## Local Setup
1. Clone the repository and navigate to the `server` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` directory:
   ```env
   PORT=5001
   DATABASE_URL=your_postgresql_connection_string
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_google_app_password
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Deployment on Render
1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. Set the **Environment** to `Node`.
4. Set the **Root Directory** to `server`.
5. Set the **Build Command** to `npm install`.
6. Set the **Start Command** to `npm start`.
7. Add the following **Environment Variables** in Render Dashboard:
   - `PORT`: `5001`
   - `DATABASE_URL`: Your PostgreSQL Internal/External URL (e.g., `postgresql://user:password@host/database`)
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASS`: Your Google App Password
   - `NODE_ENV`: `production`

## Database Schema
The server automatically creates the `contacts` table if it doesn't exist:
```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Features
- PostgreSQL with connection pooling.
- Automatic table creation.
- SSL enabled for Render.
- CORS enabled for frontend connection.
- Nodemailer with Gmail integration.
- Error handling for database and email operations.
