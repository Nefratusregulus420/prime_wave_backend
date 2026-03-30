require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { sendEmail } = require("./utils/sendEmail");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Initialize PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com") || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

// Test Database Connection and Create Table
const initDb = async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL successfully");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    client.release();
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Error connecting to database or creating table:", err.message);
  }
};

initDb();

app.post("/api/contact", async (req, res) => { 
  try { 
    console.log("Incoming request:", req.body); 

    const { name, email, message } = req.body; 

    // Validation 
    if (!name || !email || !message) { 
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required" 
      }); 
    } 

    // Send email 
    await sendEmail( 
      email, 
      `Contact Form - ${new Date().toISOString()}`, 
      `Name: ${name}\nMessage: ${message}` 
    ); 

    console.log("Email sent successfully"); 

    return res.status(200).json({ 
      success: true, 
      message: "Message sent successfully" 
    }); 

  } catch (error) { 
    console.error("CONTACT ERROR:", error.response?.body || error); 

    return res.status(500).json({ 
      success: false, 
      message: "Server error while sending email" 
    }); 
  } 
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
