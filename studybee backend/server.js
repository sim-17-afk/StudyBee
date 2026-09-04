const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── In-memory user store ────────────────────────────────────────────────────
// Replace with a real database (MongoDB, PostgreSQL, etc.) for production.
const users = new Map(); // email (lowercase) → { email, password }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Auth Routes ─────────────────────────────────────────────────────────────

// POST /api/register
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;

  // Validate email format
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  // Validate password length
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const key = email.trim().toLowerCase();

  // Check uniqueness
  if (users.has(key)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Store user (in production: hash the password with bcrypt first!)
  users.set(key, { email: key, password });

  return res.status(201).json({ message: 'Account created successfully!' });
});

// POST /api/login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const key = email.trim().toLowerCase();
  const user = users.get(key);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  return res.status(200).json({ message: 'Login successful!' });
});

// ─── Chat Route ───────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `You are StudyBee, a helpful and witty AI study assistant for Gen Z students. 
    Use a touch of bee-themed puns occasionally. Your goal is to simplify complex topics. 
    User says: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "The hive is over capacity!" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Hive Server running on port ${PORT}`));