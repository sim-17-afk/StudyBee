const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // This "System Instruction" gives the Bee its personality
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

app.listen(5000, () => console.log("Hive Server running on port 5000"));