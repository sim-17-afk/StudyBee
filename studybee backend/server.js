const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const User = require('./models/User');
const QuizAttempt = require('./models/QuizAttempt');
const StudySession = require('./models/StudySession');
const TopicProgress = require('./models/TopicProgress');

const app = express();
app.use(cors());
app.use(express.json());

// ─── MongoDB Atlas Connection ────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn(
    '⚠️ [MongoDB] MONGODB_URI is not set in .env! Please add your MongoDB Atlas connection string.'
  );
} else {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('🐝 Connected to MongoDB Atlas successfully!'))
    .catch((err) => console.error('❌ MongoDB Atlas connection error:', err.message));
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Resolve userId from email string stored in localStorage session
async function resolveUser(req, res) {
  const email = req.headers['x-user-email'];
  if (!email) {
    res.status(401).json({ error: 'Not authenticated.' });
    return null;
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    res.status(401).json({ error: 'User not found.' });
    return null;
  }
  return user;
}

// ─── Auth Routes ─────────────────────────────────────────────────────────────

// POST /api/register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database not connected. Please ensure MONGODB_URI is configured in the backend .env file.',
      });
    }

    const key = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: key });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ email: key, password: hashedPassword });

    return res.status(201).json({
      message: 'Account created successfully!',
      user: { email: newUser.email },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database not connected. Please ensure MONGODB_URI is configured in the backend .env file.',
      });
    }

    const key = email.trim().toLowerCase();
    const user = await User.findOne({ email: key });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.status(200).json({
      message: 'Login successful!',
      user: { email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

// ─── Chat Route ───────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are StudyBee, a helpful and witty AI study assistant for Gen Z students. 
    Use a touch of bee-themed puns occasionally. Your goal is to simplify complex topics. 
    User says: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'The hive is over capacity!' });
  }
});

// ─── Quiz Attempts ────────────────────────────────────────────────────────────

// POST /api/quiz-attempts — save a completed quiz
app.post('/api/quiz-attempts', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { topic, totalQuestions, correctAnswers, topicScores = [], durationSeconds = 0 } = req.body;

    if (!topic || totalQuestions == null || correctAnswers == null) {
      return res.status(400).json({ error: 'topic, totalQuestions, and correctAnswers are required.' });
    }

    // Save the raw attempt
    const attempt = await QuizAttempt.create({
      userId: user._id,
      topic,
      totalQuestions,
      correctAnswers,
      topicScores,
      durationSeconds,
    });

    // Upsert TopicProgress for the main topic
    await TopicProgress.findOneAndUpdate(
      { userId: user._id, topic },
      {
        $inc: {
          attempts: 1,
          correctAnswers,
          totalQuestions,
        },
        $set: { lastStudiedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    // Upsert per sub-topic scores if provided
    for (const ts of topicScores) {
      if (!ts.topic) continue;
      await TopicProgress.findOneAndUpdate(
        { userId: user._id, topic: ts.topic },
        {
          $inc: {
            attempts: 1,
            correctAnswers: ts.correct || 0,
            totalQuestions: ts.total || 0,
          },
          $set: { lastStudiedAt: new Date() },
        },
        { upsert: true, new: true }
      );
    }

    return res.status(201).json({ message: 'Quiz attempt saved!', attemptId: attempt._id });
  } catch (error) {
    console.error('Quiz attempt error:', error);
    return res.status(500).json({ error: 'Failed to save quiz attempt.' });
  }
});

// ─── Study Sessions ───────────────────────────────────────────────────────────

// POST /api/study-sessions/start
app.post('/api/study-sessions/start', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { activityType = 'general', topic = '' } = req.body;
    const session = await StudySession.create({
      userId: user._id,
      startedAt: new Date(),
      activityType,
      topic,
    });

    return res.status(201).json({ sessionId: session._id });
  } catch (error) {
    console.error('Session start error:', error);
    return res.status(500).json({ error: 'Failed to start study session.' });
  }
});

// POST /api/study-sessions/end
app.post('/api/study-sessions/end', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required.' });

    const session = await StudySession.findOne({ _id: sessionId, userId: user._id });
    if (!session) return res.status(404).json({ error: 'Session not found.' });

    const endedAt = new Date();
    const durationSeconds = Math.round((endedAt - session.startedAt) / 1000);

    // Guard: ignore suspiciously long sessions (> 8 hours) and already-ended ones
    if (session.endedAt) {
      return res.status(400).json({ error: 'Session already ended.' });
    }

    await StudySession.findByIdAndUpdate(sessionId, {
      endedAt,
      durationSeconds: Math.min(durationSeconds, 28800), // cap at 8h
    });

    return res.status(200).json({ message: 'Session saved.', durationSeconds });
  } catch (error) {
    console.error('Session end error:', error);
    return res.status(500).json({ error: 'Failed to end study session.' });
  }
});

// ─── Dashboard APIs ───────────────────────────────────────────────────────────

// GET /api/dashboard/overview
app.get('/api/dashboard/overview', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const userId = user._id;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // All-time quiz stats
    const allAttempts = await QuizAttempt.find({ userId });
    const totalQuizzes = allAttempts.length;
    const totalCorrect = allAttempts.reduce((s, a) => s + a.correctAnswers, 0);
    const totalQs = allAttempts.reduce((s, a) => s + a.totalQuestions, 0);
    const overallAccuracy = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0;

    // Study time this week (seconds)
    const weekSessions = await StudySession.find({
      userId,
      startedAt: { $gte: weekStart },
      endedAt: { $ne: null },
    });
    const weekSeconds = weekSessions.reduce((s, sess) => s + (sess.durationSeconds || 0), 0);
    const weekHours = Math.floor(weekSeconds / 3600);
    const weekMins = Math.floor((weekSeconds % 3600) / 60);
    const studyTimeLabel = weekHours > 0 ? `${weekHours}h ${weekMins}m` : `${weekMins}m`;

    // Streak calculation
    const allSessions = await StudySession.find({ userId, endedAt: { $ne: null } }).sort({ startedAt: -1 });
    const studyDays = new Set(
      allSessions.map((s) => {
        const d = new Date(s.startedAt);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );
    // Also count quiz attempts as activity
    const allAttemptsForStreak = await QuizAttempt.find({ userId }).sort({ createdAt: -1 });
    allAttemptsForStreak.forEach((a) => {
      const d = new Date(a.createdAt);
      studyDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });

    let streak = 0;
    let checkDate = new Date();
    while (true) {
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (studyDays.has(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return res.json({
      overallAccuracy,
      studyStreak: streak,
      totalQuizzes,
      studyTimeThisWeek: studyTimeLabel,
      weekSeconds,
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard overview.' });
  }
});

// GET /api/dashboard/weekly-progress
app.get('/api/dashboard/weekly-progress', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const userId = user._id;
    const days = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const sessions = await StudySession.find({
        userId,
        startedAt: { $gte: start, $lte: end },
        endedAt: { $ne: null },
      });

      const attempts = await QuizAttempt.find({
        userId,
        createdAt: { $gte: start, $lte: end },
      });

      const studyMins = Math.round(
        sessions.reduce((s, sess) => s + (sess.durationSeconds || 0), 0) / 60
      );
      const dayCorrect = attempts.reduce((s, a) => s + a.correctAnswers, 0);
      const dayTotal = attempts.reduce((s, a) => s + a.totalQuestions, 0);
      const dayAccuracy = dayTotal > 0 ? Math.round((dayCorrect / dayTotal) * 100) : null;

      days.push({
        label: dayLabels[d.getDay()],
        date: d.toISOString().split('T')[0],
        studyMinutes: studyMins,
        quizzesCompleted: attempts.length,
        accuracy: dayAccuracy,
      });
    }

    return res.json({ days });
  } catch (error) {
    console.error('Weekly progress error:', error);
    return res.status(500).json({ error: 'Failed to load weekly progress.' });
  }
});

// GET /api/dashboard/weak-topics
app.get('/api/dashboard/weak-topics', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    // Topics with >= 2 attempts and accuracy < 70%
    const topics = await TopicProgress.find({ userId: user._id, attempts: { $gte: 2 } });

    const weak = topics
      .map((t) => ({
        topic: t.topic,
        attempts: t.attempts,
        accuracy: t.totalQuestions > 0 ? Math.round((t.correctAnswers / t.totalQuestions) * 100) : 0,
        lastStudiedAt: t.lastStudiedAt,
      }))
      .filter((t) => t.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    return res.json({ weakTopics: weak });
  } catch (error) {
    console.error('Weak topics error:', error);
    return res.status(500).json({ error: 'Failed to load weak topics.' });
  }
});

// GET /api/dashboard/recommendations
app.get('/api/dashboard/recommendations', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const userId = user._id;
    const recommendations = [];

    // 1. Weak topic recommendations (accuracy < 70%, >= 2 attempts)
    const allTopics = await TopicProgress.find({ userId, attempts: { $gte: 2 } });
    const weakTopics = allTopics
      .map((t) => ({
        topic: t.topic,
        accuracy: t.totalQuestions > 0 ? Math.round((t.correctAnswers / t.totalQuestions) * 100) : 0,
      }))
      .filter((t) => t.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 2);

    for (const wt of weakTopics) {
      recommendations.push({
        type: 'revise',
        icon: '📖',
        title: `Revise ${wt.topic}`,
        description: `Your recent quiz attempts show difficulty with this topic (${wt.accuracy}% accuracy). A focused revision session will help.`,
        priority: wt.accuracy < 50 ? 'High' : 'Medium',
        topic: wt.topic,
      });
    }

    // 2. Suggest retrying incorrect questions if last quiz was poor
    const lastAttempt = await QuizAttempt.findOne({ userId }).sort({ createdAt: -1 });
    if (lastAttempt) {
      const lastAccuracy =
        lastAttempt.totalQuestions > 0
          ? Math.round((lastAttempt.correctAnswers / lastAttempt.totalQuestions) * 100)
          : 100;
      if (lastAccuracy < 80) {
        recommendations.push({
          type: 'retry',
          icon: '🔁',
          title: 'Retry your incorrect questions',
          description: `You scored ${lastAccuracy}% on your last "${lastAttempt.topic}" quiz. Revisit the concepts you missed and check whether you understand them now.`,
          priority: 'Medium',
          topic: lastAttempt.topic,
        });
      }
    }

    // 3. Suggest a new practice quiz if studied recently but no quiz today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const quizToday = await QuizAttempt.findOne({ userId, createdAt: { $gte: todayStart } });
    if (!quizToday) {
      recommendations.push({
        type: 'quiz',
        icon: '📝',
        title: 'Take a short practice quiz',
        description: "You haven't taken a quiz today. Test your understanding — even 5 minutes of quizzing boosts retention significantly!",
        priority: 'Low',
        topic: null,
      });
    }

    // 4. If no activity at all → onboarding nudge
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'start',
        icon: '🚀',
        title: 'Start your first quiz',
        description: "Use the Generate Quiz feature to create a practice test from your notes. Your progress will appear here once you complete it!",
        priority: 'High',
        topic: null,
      });
    }

    return res.json({ recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    return res.status(500).json({ error: 'Failed to load recommendations.' });
  }
});

// GET /api/dashboard/quiz-history
app.get('/api/dashboard/quiz-history', async (req, res) => {
  try {
    const user = await resolveUser(req, res);
    if (!user) return;

    const attempts = await QuizAttempt.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const history = attempts.map((a) => ({
      id: a._id,
      topic: a.topic,
      score: `${a.correctAnswers}/${a.totalQuestions}`,
      accuracy: a.totalQuestions > 0 ? Math.round((a.correctAnswers / a.totalQuestions) * 100) : 0,
      date: a.createdAt,
    }));

    return res.json({ history });
  } catch (error) {
    console.error('Quiz history error:', error);
    return res.status(500).json({ error: 'Failed to load quiz history.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🐝 Hive Server running on port ${PORT}`));