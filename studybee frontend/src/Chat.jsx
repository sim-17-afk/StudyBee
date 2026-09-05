import React, { useState, useRef, useEffect } from 'react';
import './Chat.css';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o-mini'; // fast & affordable via OpenRouter

// ── Per-mode config ───────────────────────────────────────────────────────────
const MODES = {
  'ai-bee': {
    label: '🐝 AI Bee',
    placeholder: 'Ask me anything about your studies...',
    greeting: "Bzzzt! I'm your AI Bee 🐝 — your personal study buddy. Ask me anything!",
    systemPrompt: `You are StudyBee, a friendly and witty AI study assistant for students. 
You help with any academic topic. Use occasional bee-themed puns but keep answers clear, 
concise, and easy to understand. Format lists with bullet points when helpful.`,
  },
  'find-answers': {
    label: '🔍 Find Answers',
    placeholder: 'Paste your question or text here...',
    greeting: "🔍 Find Answers mode! Paste your question or a paragraph from your textbook and I'll find the answer for you.",
    systemPrompt: `You are StudyBee's Answer Finder. The student will paste questions or 
textbook excerpts. Your job is to find and explain the answer clearly and concisely. 
If given multiple questions, answer each one numbered. Be direct and educational.`,
  },
  'generate-quiz': {
    label: '📝 Generate Quiz',
    placeholder: 'Paste your notes or topic to quiz on...',
    greeting: "📝 Quiz Generator ready! Paste your notes or tell me a topic and I'll generate a quiz with multiple-choice questions and answers.",
    systemPrompt: `You are StudyBee's Quiz Generator. When given notes or a topic, generate 
5 multiple-choice questions (A/B/C/D options) based on the content. After all questions, 
provide an "Answer Key" section. Format questions clearly and numbered. Make questions 
progressively harder. Add a difficulty label (Easy/Medium/Hard) to each question.`,
  },
  'summarize-notes': {
    label: '📜 Summarize Notes',
    placeholder: 'Paste your notes or chapter text here...',
    greeting: "📜 Note Summarizer ready! Paste any text — lecture notes, chapters, articles — and I'll condense them into clear key points.",
    systemPrompt: `You are StudyBee's Note Summarizer. When given text, produce:
1. A 2-3 sentence TL;DR summary
2. Key Points as bullet points (max 8 bullets)
3. Important Terms (if any) with brief definitions
Keep everything concise and student-friendly. Use simple language.`,
  },
};

// ── Real-time date context ───────────────────────────────────────────────────
function getRealTimeContext() {
  const now = new Date();
  return `[Current date & time: ${now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}]`;
}

// ── OpenRouter call ───────────────────────────────────────────────────────────
async function callOpenRouter(mode, messages) {
  const config = MODES[mode];
  const systemContent = `${getRealTimeContext()}\n\n${config.systemPrompt}`;
  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemContent },
      ...messages.map((m) => ({
        role: m.role === 'bee' ? 'assistant' : 'user',
        content: m.text,
      })),
    ],
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'StudyBee',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ── Component ─────────────────────────────────────────────────────────────────
const Chat = ({ onBack, initialMode = 'ai-bee' }) => {
  const [mode, setMode] = useState(initialMode);
  const [chatHistories, setChatHistories] = useState(() =>
    Object.fromEntries(
      Object.entries(MODES).map(([key, cfg]) => [
        key,
        [{ role: 'bee', text: cfg.greeting }],
      ])
    )
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const messages = chatHistories[mode];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const switchMode = (newMode) => {
    localStorage.setItem('studybee_feature', newMode);
    localStorage.setItem('studybee_screen', 'chat');
    setMode(newMode);
    setInput('');
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', text };
    const updatedHistory = [...messages, userMsg];

    setChatHistories((prev) => ({ ...prev, [mode]: updatedHistory }));
    setInput('');
    setLoading(true);

    try {
      const reply = await callOpenRouter(mode, updatedHistory);
      setChatHistories((prev) => ({
        ...prev,
        [mode]: [...updatedHistory, { role: 'bee', text: reply }],
      }));
    } catch (err) {
      setChatHistories((prev) => ({
        ...prev,
        [mode]: [
          ...updatedHistory,
          { role: 'bee', text: `⚠️ Bzzzt! Something went wrong: ${err.message}` },
        ],
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="sidebar-logo">Study<span>Bee</span></div>

        {Object.entries(MODES).map(([key, cfg]) => (
          <button
            key={key}
            className={`side-item ${mode === key ? 'active' : ''}`}
            onClick={() => switchMode(key)}
          >
            {cfg.label}
          </button>
        ))}

        <button className="back-btn" onClick={onBack}>← Dashboard</button>
      </div>

      {/* Main area */}
      <div className="chat-main">
        <div className="chat-window">
          {/* Mode header */}
          <div className="chat-header">
            <span className="chat-mode-title">{MODES[mode].label}</span>
          </div>

          {/* Messages */}
          <div className="messages-container">
            {messages.map((msg, i) => (
              <div key={i} className={`message-bubble ${msg.role}`}>
                {msg.text.split('\n').map((line, j) => (
                  <span key={j}>{line}<br /></span>
                ))}
              </div>
            ))}
            {loading && (
              <div className="message-bubble bee loading-bubble">
                <span className="dot-flashing">🐝 thinking</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="input-area">
            <textarea
              rows={2}
              placeholder={MODES[mode].placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              {loading ? '...' : 'Send ➔'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;