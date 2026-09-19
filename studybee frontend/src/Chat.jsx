import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import BeeBot from './BeeBot';
import './Chat.css';

// Set the PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o-mini';

// ── AI Bee Quick Starter Suggestions ─────────────────────────────────────────
const AI_BEE_PROMPTS = [
  {
    icon: '💡',
    title: 'Explain Simply',
    prompt: 'Can you explain Photosynthesis in simple terms with everyday analogies?',
  },
  {
    icon: '⚡',
    title: 'Exam Study Tips',
    prompt: 'What are the top 5 scientifically proven techniques to memorize study material faster?',
  },
  {
    icon: '📝',
    title: 'Essay Outline Helper',
    prompt: 'Help me outline a well-structured essay about Artificial Intelligence in modern education.',
  },
  {
    icon: '🧠',
    title: 'Test My Knowledge',
    prompt: 'Can you ask me 3 challenging questions to test my understanding of the Solar System?',
  },
];

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
    placeholder: 'Or type your question here...',
    greeting: "🔍 Find Answers mode! Upload your notes and questions using the buttons below, then hit Find Answers — or just type your question directly.",
    systemPrompt: `You are StudyBee's Answer Finder. The student will provide notes/study material and questions.
Your job is to find and explain the answers clearly and concisely using the provided notes as context.
If given multiple questions, answer each one numbered. Be direct and educational.
If images are provided, analyze them carefully for relevant information.`,
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

// ── Extract text from PDF file ────────────────────────────────────────────────
async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(' ') + '\n';
  }
  return text.trim();
}

// ── Convert image file to base64 data URL ────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Get file type category ───────────────────────────────────────────────────
function getFileCategory(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'text/plain' || name.endsWith('.txt')) return 'text';
  return 'unknown';
}

// ── OpenRouter call (supports text + images) ──────────────────────────────────
async function callOpenRouter(mode, messages) {
  const config = MODES[mode];
  const systemContent = `${getRealTimeContext()}\n\n${config.systemPrompt}`;

  const apiMessages = [{ role: 'system', content: systemContent }];

  for (const m of messages) {
    const role = m.role === 'bee' ? 'assistant' : 'user';
    // If message has image parts (vision)
    if (m.images && m.images.length > 0) {
      const content = [];
      if (m.text) content.push({ type: 'text', text: m.text });
      for (const img of m.images) {
        content.push({
          type: 'image_url',
          image_url: { url: img },
        });
      }
      apiMessages.push({ role, content });
    } else {
      apiMessages.push({ role, content: m.text });
    }
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'StudyBee',
    },
    body: JSON.stringify({ model: MODEL, messages: apiMessages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ── File Chip component ───────────────────────────────────────────────────────
function FileChip({ file, onRemove }) {
  const cat = getFileCategory(file);
  const icons = { pdf: '📄', ppt: '📊', image: '🖼️', text: '📝', unknown: '📎' };
  return (
    <span className="file-chip">
      {icons[cat]} {file.name.length > 20 ? file.name.slice(0, 18) + '…' : file.name}
      <button className="file-chip-remove" onClick={onRemove} title="Remove file">×</button>
    </span>
  );
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

  // File upload state (for find-answers mode)
  const [notesFiles, setNotesFiles] = useState([]);
  const [questionsFiles, setQuestionsFiles] = useState([]);
  const [processingFiles, setProcessingFiles] = useState(false);

  // Quiz state (for generate-quiz mode)
  const [quizTopic, setQuizTopic] = useState('');
  const [quizNotesFiles, setQuizNotesFiles] = useState([]);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [tempTopicInput, setTempTopicInput] = useState('');

  // Summarize state (for summarize-notes mode)
  const [summaryFiles, setSummaryFiles] = useState([]);
  const [summaryStyle, setSummaryStyle] = useState('points'); // 'shorten' | 'points' | 'very-short'
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);

  const notesInputRef = useRef(null);
  const questionsInputRef = useRef(null);
  const quizNotesInputRef = useRef(null);
  const summaryNotesInputRef = useRef(null);
  const stylePickerRef = useRef(null);
  const bottomRef = useRef(null);

  const messages = chatHistories[mode];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (stylePickerRef.current && !stylePickerRef.current.contains(e.target)) {
        setIsStyleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchMode = (newMode) => {
    localStorage.setItem('studybee_feature', newMode);
    localStorage.setItem('studybee_screen', 'chat');
    setMode(newMode);
    setInput('');
    setNotesFiles([]);
    setQuestionsFiles([]);
    setQuizTopic('');
    setQuizNotesFiles([]);
    setIsTopicModalOpen(false);
    setSummaryFiles([]);
    setIsStyleMenuOpen(false);
  };

  // ── Standard send (non-find-answers or typed question) ───────────────────────
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
        [mode]: [...updatedHistory, { role: 'bee', text: `⚠️ Bzzzt! Something went wrong: ${err.message}` }],
      }));
    } finally {
      setLoading(false);
    }
  };

  // ── Quick Prompt send (from AI Bee starter cards or BeeBot) ───────────────────
  const handleQuickPrompt = async (promptText) => {
    if (loading || processingFiles || !promptText.trim()) return;

    const userMsg = { role: 'user', text: promptText.trim() };
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
        [mode]: [...updatedHistory, { role: 'bee', text: `⚠️ Bzzzt! Something went wrong: ${err.message}` }],
      }));
    } finally {
      setLoading(false);
    }
  };

  // ── Clear / Reset conversation ───────────────────────────────────────────────
  const handleClearChat = () => {
    setChatHistories((prev) => ({
      ...prev,
      [mode]: [{ role: 'bee', text: MODES[mode].greeting }],
    }));
  };

  // ── Generate Quiz: process topic & notes then call AI ────────────────────────
  const handleGenerateQuiz = async () => {
    if (loading || processingFiles) return;
    const effectiveTopic = quizTopic.trim() || input.trim();
    if (!effectiveTopic && quizNotesFiles.length === 0) return;

    setProcessingFiles(true);

    try {
      let notesText = '';
      const imageFiles = [];

      // Process uploaded notes files
      for (const file of quizNotesFiles) {
        const cat = getFileCategory(file);
        if (cat === 'pdf') {
          const text = await extractPdfText(file);
          notesText += `\n[Notes from ${file.name}]:\n${text}\n`;
        } else if (cat === 'image') {
          const b64 = await fileToBase64(file);
          imageFiles.push({ src: b64, label: `Notes image: ${file.name}` });
          notesText += `\n[Image notes provided: ${file.name}]\n`;
        } else if (cat === 'ppt') {
          notesText += `\n[PowerPoint file "${file.name}" uploaded. Please generate quiz questions based on key concepts from this topic.]\n`;
        } else if (cat === 'text') {
          const text = await file.text();
          notesText += `\n[Notes from ${file.name}]:\n${text}\n`;
        }
      }

      // Build prompt parts
      const promptParts = [];
      if (effectiveTopic) {
        promptParts.push(`🎯 QUIZ TOPIC:\n${effectiveTopic}`);
      }
      if (notesText.trim()) {
        promptParts.push(`📚 STUDY NOTES / REFERENCE MATERIAL:\n${notesText.trim()}`);
      }
      if (input.trim() && input.trim() !== effectiveTopic) {
        promptParts.push(`✏️ EXTRA INSTRUCTIONS:\n${input.trim()}`);
      }

      const fullPrompt = promptParts.join('\n\n') +
        '\n\nPlease create a 5-question practice quiz based on the above topic and notes. Include multiple-choice options (A, B, C, D), difficulty levels (Easy, Medium, Hard), and provide an Answer Key with brief explanations at the end.';

      // Summary label for display bubble
      const summaryParts = [];
      if (effectiveTopic) summaryParts.push(`Topic "${effectiveTopic}"`);
      if (quizNotesFiles.length > 0) summaryParts.push(`${quizNotesFiles.length} notes file${quizNotesFiles.length > 1 ? 's' : ''}`);
      if (input.trim() && input.trim() !== effectiveTopic) summaryParts.push('custom instructions');
      const displayLabel = `📝 Generating quiz for: ${summaryParts.join(' + ') || 'notes'}`;

      const userMsg = {
        role: 'user',
        text: fullPrompt,
        displayText: displayLabel,
        images: imageFiles.map((img) => img.src),
      };

      const updatedHistory = [...messages, userMsg];
      setChatHistories((prev) => ({ ...prev, [mode]: updatedHistory }));
      setInput('');
      setQuizTopic('');
      setQuizNotesFiles([]);
      setProcessingFiles(false);
      setLoading(true);

      const reply = await callOpenRouter('generate-quiz', updatedHistory);
      setChatHistories((prev) => ({
        ...prev,
        [mode]: [...updatedHistory, { role: 'bee', text: reply }],
      }));
    } catch (err) {
      setChatHistories((prev) => ({
        ...prev,
        [mode]: [...messages, { role: 'bee', text: `⚠️ Error generating quiz: ${err.message}` }],
      }));
      setProcessingFiles(false);
    } finally {
      setLoading(false);
      setProcessingFiles(false);
    }
  };

  // ── Find Answers: process uploaded files then call AI ─────────────────────────
  const handleFindAnswers = async () => {
    if (loading || processingFiles) return;
    if (notesFiles.length === 0 && questionsFiles.length === 0 && !input.trim()) return;

    setProcessingFiles(true);

    try {
      let notesText = '';
      let questionsText = input.trim();
      const imageFiles = []; // images from both notes and questions

      // Process notes files
      for (const file of notesFiles) {
        const cat = getFileCategory(file);
        if (cat === 'pdf') {
          const text = await extractPdfText(file);
          notesText += `\n[Notes from ${file.name}]:\n${text}\n`;
        } else if (cat === 'image') {
          const b64 = await fileToBase64(file);
          imageFiles.push({ src: b64, label: `Notes image: ${file.name}` });
          notesText += `\n[Image notes provided: ${file.name}]\n`;
        } else if (cat === 'ppt') {
          notesText += `\n[Note: PowerPoint file "${file.name}" was uploaded. Please manually paste key text from it.]\n`;
        } else if (cat === 'text') {
          const text = await file.text();
          notesText += `\n[Notes from ${file.name}]:\n${text}\n`;
        }
      }

      // Process questions files
      for (const file of questionsFiles) {
        const cat = getFileCategory(file);
        if (cat === 'pdf') {
          const text = await extractPdfText(file);
          questionsText += `\n[Questions from ${file.name}]:\n${text}\n`;
        } else if (cat === 'image') {
          const b64 = await fileToBase64(file);
          imageFiles.push({ src: b64, label: `Questions image: ${file.name}` });
          questionsText += `\n[Image with questions provided: ${file.name}]\n`;
        } else if (cat === 'ppt') {
          questionsText += `\n[Note: PowerPoint file "${file.name}" was uploaded. Please manually paste the questions from it.]\n`;
        } else if (cat === 'text') {
          const text = await file.text();
          questionsText += `\n[Questions from ${file.name}]:\n${text}\n`;
        }
      }

      // Build the combined prompt
      let combinedText = '';
      if (notesText) combinedText += `📚 STUDY NOTES / MATERIAL:\n${notesText}\n\n`;
      if (questionsText) combinedText += `❓ QUESTIONS TO ANSWER:\n${questionsText}`;
      if (!combinedText.trim()) return;

      // Build summary label for chat bubble
      const parts = [];
      if (notesFiles.length > 0) parts.push(`${notesFiles.length} notes file${notesFiles.length > 1 ? 's' : ''}`);
      if (questionsFiles.length > 0) parts.push(`${questionsFiles.length} question file${questionsFiles.length > 1 ? 's' : ''}`);
      if (input.trim()) parts.push('typed question');
      const label = parts.join(' + ');

      const userMsg = {
        role: 'user',
        text: combinedText,
        displayText: `🔍 Finding answers from: ${label}`,
        images: imageFiles.map((img) => img.src),
      };

      const updatedHistory = [...messages, userMsg];
      setChatHistories((prev) => ({ ...prev, [mode]: updatedHistory }));
      setInput('');
      setNotesFiles([]);
      setQuestionsFiles([]);
      setProcessingFiles(false);
      setLoading(true);

      const reply = await callOpenRouter('find-answers', updatedHistory);
      setChatHistories((prev) => ({
        ...prev,
        [mode]: [...updatedHistory, { role: 'bee', text: reply }],
      }));
    } catch (err) {
      setChatHistories((prev) => ({
        ...prev,
        [mode]: [...messages, { role: 'bee', text: `⚠️ Error processing files: ${err.message}` }],
      }));
      setProcessingFiles(false);
    } finally {
      setLoading(false);
      setProcessingFiles(false);
    }
  };

  // ── Summarize Notes: process uploaded files & style then call AI ─────────────
  const handleSummarizeNotes = async () => {
    if (loading || processingFiles) return;
    const typedNotes = input.trim();
    if (summaryFiles.length === 0 && !typedNotes) return;

    setProcessingFiles(true);

    try {
      let notesText = '';
      const imageFiles = [];

      for (const file of summaryFiles) {
        const cat = getFileCategory(file);
        if (cat === 'pdf') {
          const text = await extractPdfText(file);
          notesText += `\n[Notes from ${file.name}]:\n${text}\n`;
        } else if (cat === 'image') {
          const b64 = await fileToBase64(file);
          imageFiles.push({ src: b64, label: `Notes image: ${file.name}` });
          notesText += `\n[Image notes provided: ${file.name}]\n`;
        } else if (cat === 'ppt') {
          notesText += `\n[PowerPoint file "${file.name}" uploaded. Please summarize the key topics and concepts from this presentation.]\n`;
        } else if (cat === 'text') {
          const text = await file.text();
          notesText += `\n[Notes from ${file.name}]:\n${text}\n`;
        }
      }

      // Format based on summaryStyle
      let styleInstruction = '';
      let styleLabel = '';
      if (summaryStyle === 'shorten') {
        styleLabel = 'Shorten Notes';
        styleInstruction = 'SHORTEN THE NOTES: Condense the provided notes into a clear, shortened version while preserving essential explanations, arguments, and context.';
      } else if (summaryStyle === 'very-short') {
        styleLabel = 'Very Short TL;DR';
        styleInstruction = 'SUMMARIZE IN VERY SHORT: Provide an ultra-concise summary. Give a 2-3 sentence executive TL;DR overview followed by at most 3-4 key takeaway bullet points.';
      } else {
        styleLabel = 'Important Points';
        styleInstruction = 'GIVE IMPORTANT POINTS: Extract and present the most critical exam concepts, facts, definitions, and key takeaways as clear, organized bullet points.';
      }

      const promptParts = [];
      promptParts.push(`🎯 SUMMARY STYLE REQUESTED: ${styleInstruction}`);
      if (notesText.trim()) {
        promptParts.push(`📚 UPLOADED NOTES / MATERIAL:\n${notesText.trim()}`);
      }
      if (typedNotes) {
        promptParts.push(`📝 NOTES / TEXT TO SUMMARIZE:\n${typedNotes}`);
      }

      const fullPrompt = promptParts.join('\n\n');

      const parts = [];
      if (summaryFiles.length > 0) parts.push(`${summaryFiles.length} file${summaryFiles.length > 1 ? 's' : ''}`);
      if (typedNotes) parts.push('pasted text');
      const displayLabel = `📜 Summarizing notes (${styleLabel}): ${parts.join(' + ') || 'notes'}`;

      const userMsg = {
        role: 'user',
        text: fullPrompt,
        displayText: displayLabel,
        images: imageFiles.map((img) => img.src),
      };

      const updatedHistory = [...messages, userMsg];
      setChatHistories((prev) => ({ ...prev, [mode]: updatedHistory }));
      setInput('');
      setSummaryFiles([]);
      setProcessingFiles(false);
      setLoading(true);

      const reply = await callOpenRouter('summarize-notes', updatedHistory);
      setChatHistories((prev) => ({
        ...prev,
        [mode]: [...updatedHistory, { role: 'bee', text: reply }],
      }));
    } catch (err) {
      setChatHistories((prev) => ({
        ...prev,
        [mode]: [...messages, { role: 'bee', text: `⚠️ Error summarizing notes: ${err.message}` }],
      }));
      setProcessingFiles(false);
    } finally {
      setLoading(false);
      setProcessingFiles(false);
    }
  };

  const addFiles = (existing, newFiles) => {
    const all = [...existing];
    for (const f of newFiles) {
      if (!all.find((e) => e.name === f.name && e.size === f.size)) all.push(f);
    }
    return all;
  };

  const isFindAnswers = mode === 'find-answers';
  const isGenerateQuiz = mode === 'generate-quiz';
  const isSummarizeNotes = mode === 'summarize-notes';
  const canFindAnswers = (notesFiles.length > 0 || questionsFiles.length > 0 || Boolean(input.trim())) && !loading && !processingFiles;
  const canGenerateQuiz = (Boolean(quizTopic.trim()) || quizNotesFiles.length > 0 || Boolean(input.trim())) && !loading && !processingFiles;
  const canSummarize = (summaryFiles.length > 0 || Boolean(input.trim())) && !loading && !processingFiles;

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
        <div className={`chat-window mode-${mode}`}>
          {/* Mode header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <span className="chat-mode-title">{MODES[mode].label}</span>
              {mode === 'ai-bee' && (
                <span className="bee-live-badge">
                  <span className="bee-pulse-dot" /> Online & Buzzing 🍯
                </span>
              )}
            </div>

            {messages.length > 1 && (
              <button
                className="chat-header-action-btn"
                onClick={handleClearChat}
                title="Start a fresh chat"
              >
                🧹 New Chat
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="messages-container">
            {/* AI Bee Honeycomb Quick Starters */}
            {mode === 'ai-bee' && messages.length <= 1 && (
              <div className="ai-bee-starter-container">
                <div className="ai-bee-starter-header">
                  <div className="starter-badge">🍯 Sweet Suggestions</div>
                  <h4>What would you like to explore today?</h4>
                  <p>Pick a sweet starter below or ask anything about your studies:</p>
                </div>
                <div className="ai-bee-prompts-grid">
                  {AI_BEE_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="ai-bee-prompt-card"
                      onClick={() => handleQuickPrompt(item.prompt)}
                      disabled={loading}
                    >
                      <div className="prompt-card-icon">{item.icon}</div>
                      <div className="prompt-card-text">
                        <strong>{item.title}</strong>
                        <small>"{item.prompt}"</small>
                      </div>
                      <span className="prompt-card-arrow">➔</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role}`}>
                {msg.role === 'bee' && (
                  <div className="bee-msg-avatar" title="StudyBee">
                    🐝
                  </div>
                )}
                <div className={`message-bubble ${msg.role}`}>
                  {/* Show display label if available, else full text */}
                  {(msg.displayText || msg.text).split('\n').map((line, j) => (
                    <span key={j}>{line}<br /></span>
                  ))}
                </div>
              </div>
            ))}
            {(loading || processingFiles) && (
              <div className="message-row bee">
                <div className="bee-msg-avatar" title="StudyBee">
                  🐝
                </div>
                <div className="message-bubble bee loading-bubble">
                  <span className="dot-flashing">
                    {processingFiles ? '📂 Reading your files...' : '🐝 thinking sweet thoughts...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="input-area">
            {/* Active Chips Strip (Topic / Attached Files / Summary Style) */}
            {((isGenerateQuiz && (quizTopic || quizNotesFiles.length > 0)) ||
              (isFindAnswers && (notesFiles.length > 0 || questionsFiles.length > 0)) ||
              (isSummarizeNotes && (summaryFiles.length > 0 || summaryStyle))) && (
              <div className="input-chips-bar">
                <span className="input-chips-label">Attached:</span>
                {isGenerateQuiz && quizTopic && (
                  <span className="file-chip topic-chip">
                    🎯 Topic: <strong>{quizTopic}</strong>
                    <button
                      className="file-chip-remove"
                      onClick={() => setQuizTopic('')}
                      title="Clear topic"
                    >
                      ×
                    </button>
                  </span>
                )}
                {isGenerateQuiz &&
                  quizNotesFiles.map((f, i) => (
                    <FileChip
                      key={i}
                      file={f}
                      onRemove={() =>
                        setQuizNotesFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    />
                  ))}
                {isFindAnswers &&
                  notesFiles.map((f, i) => (
                    <FileChip
                      key={i}
                      file={f}
                      onRemove={() =>
                        setNotesFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    />
                  ))}
                {isFindAnswers &&
                  questionsFiles.map((f, i) => (
                    <FileChip
                      key={i}
                      file={f}
                      onRemove={() =>
                        setQuestionsFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    />
                  ))}
                {isSummarizeNotes && (
                  <span className="file-chip topic-chip">
                    {summaryStyle === 'shorten' ? '📌' : summaryStyle === 'very-short' ? '⚡' : '⭐'}{' '}
                    Option:{' '}
                    <strong>
                      {summaryStyle === 'shorten'
                        ? 'Shorten Notes'
                        : summaryStyle === 'very-short'
                        ? 'Very Short TL;DR'
                        : 'Important Points'}
                    </strong>
                  </span>
                )}
                {isSummarizeNotes &&
                  summaryFiles.map((f, i) => (
                    <FileChip
                      key={i}
                      file={f}
                      onRemove={() =>
                        setSummaryFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    />
                  ))}
              </div>
            )}

            {/* Input row: buttons between left panel and text box */}
            <div className="input-row">
              {/* Find Answers: 3 compact honeycomb buttons */}
              {isFindAnswers && (
                <div className="side-action-buttons">
                  <input
                    ref={notesInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setNotesFiles((prev) => addFiles(prev, Array.from(e.target.files)))}
                    id="notes-upload"
                  />
                  <input
                    ref={questionsInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.txt,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setQuestionsFiles((prev) => addFiles(prev, Array.from(e.target.files)))}
                    id="questions-upload"
                  />

                  {/* 1: Upload Notes */}
                  <button
                    className={`mini-hex-btn notes-btn ${notesFiles.length > 0 ? 'has-value' : ''}`}
                    onClick={() => notesInputRef.current?.click()}
                    disabled={loading || processingFiles}
                    title="Upload Notes (PDF, PPT, Images)"
                  >
                    <span className="mini-btn-step">1</span>
                    <div className="mini-btn-icon">📚</div>
                    <div className="mini-btn-text">
                      <strong>Notes</strong>
                      <small>{notesFiles.length > 0 ? `${notesFiles.length} file${notesFiles.length > 1 ? 's' : ''}` : 'Upload'}</small>
                    </div>
                  </button>

                  {/* 2: Upload Questions */}
                  <button
                    className={`mini-hex-btn questions-btn ${questionsFiles.length > 0 ? 'has-value' : ''}`}
                    onClick={() => questionsInputRef.current?.click()}
                    disabled={loading || processingFiles}
                    title="Upload Questions (PDF, PPT, Images, TXT)"
                  >
                    <span className="mini-btn-step">2</span>
                    <div className="mini-btn-icon">❓</div>
                    <div className="mini-btn-text">
                      <strong>Questions</strong>
                      <small>{questionsFiles.length > 0 ? `${questionsFiles.length} file${questionsFiles.length > 1 ? 's' : ''}` : 'Upload'}</small>
                    </div>
                  </button>

                  {/* 3: Find Answers CTA */}
                  <button
                    className="mini-hex-btn mini-hex-cta"
                    onClick={handleFindAnswers}
                    disabled={!canFindAnswers}
                    title="Find Answers"
                  >
                    <span className="mini-btn-step">3</span>
                    <div className="mini-btn-icon">🔍</div>
                    <div className="mini-btn-text">
                      <strong>Find Answers</strong>
                      <small>{processingFiles ? 'Thinking...' : 'Start'}</small>
                    </div>
                  </button>
                </div>
              )}

              {/* Generate Quiz: 3 compact honeycomb buttons */}
              {isGenerateQuiz && (
                <div className="side-action-buttons">
                  <input
                    ref={quizNotesInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.txt,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setQuizNotesFiles((prev) => addFiles(prev, Array.from(e.target.files)))}
                    id="quiz-notes-upload"
                  />

                  {/* 1: Enter Topic */}
                  <button
                    className={`mini-hex-btn topic-btn ${quizTopic ? 'has-value' : ''}`}
                    onClick={() => {
                      setTempTopicInput(quizTopic);
                      setIsTopicModalOpen(true);
                    }}
                    disabled={loading || processingFiles}
                    title="Enter Quiz Topic"
                  >
                    <span className="mini-btn-step">1</span>
                    <div className="mini-btn-icon">🎯</div>
                    <div className="mini-btn-text">
                      <strong>Topic</strong>
                      <small>{quizTopic ? (quizTopic.length > 9 ? quizTopic.slice(0, 8) + '…' : quizTopic) : 'Set Topic'}</small>
                    </div>
                  </button>

                  {/* 2: Upload Notes */}
                  <button
                    className={`mini-hex-btn notes-btn ${quizNotesFiles.length > 0 ? 'has-value' : ''}`}
                    onClick={() => quizNotesInputRef.current?.click()}
                    disabled={loading || processingFiles}
                    title="Upload Notes (Optional: PDF, PPT, Images)"
                  >
                    <span className="mini-btn-step">2</span>
                    <div className="mini-btn-icon">📚</div>
                    <div className="mini-btn-text">
                      <strong>Notes</strong>
                      <small>{quizNotesFiles.length > 0 ? `${quizNotesFiles.length} file${quizNotesFiles.length > 1 ? 's' : ''}` : 'Optional'}</small>
                    </div>
                  </button>

                  {/* 3: Generate Quiz CTA */}
                  <button
                    className="mini-hex-btn mini-hex-cta"
                    onClick={handleGenerateQuiz}
                    disabled={!canGenerateQuiz}
                    title="Generate Practice Quiz"
                  >
                    <span className="mini-btn-step">3</span>
                    <div className="mini-btn-icon">📝</div>
                    <div className="mini-btn-text">
                      <strong>Generate Quiz</strong>
                      <small>{processingFiles ? 'Reading...' : 'Start'}</small>
                    </div>
                  </button>
                </div>
              )}

              {/* Summarize Notes: 3 compact honeycomb buttons */}
              {isSummarizeNotes && (
                <div className="side-action-buttons">
                  <input
                    ref={summaryNotesInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.txt,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setSummaryFiles((prev) => addFiles(prev, Array.from(e.target.files)))}
                    id="summary-notes-upload"
                  />

                  {/* 1: Upload Notes */}
                  <button
                    className={`mini-hex-btn notes-btn ${summaryFiles.length > 0 ? 'has-value' : ''}`}
                    onClick={() => summaryNotesInputRef.current?.click()}
                    disabled={loading || processingFiles}
                    title="Upload Notes (PDF, PPT, Images, TXT)"
                  >
                    <span className="mini-btn-step">1</span>
                    <div className="mini-btn-icon">📚</div>
                    <div className="mini-btn-text">
                      <strong>Notes</strong>
                      <small>{summaryFiles.length > 0 ? `${summaryFiles.length} file${summaryFiles.length > 1 ? 's' : ''}` : 'Upload'}</small>
                    </div>
                  </button>

                  {/* 2: Summary Style / Options */}
                  <div className="style-picker-container" ref={stylePickerRef}>
                    <button
                      className="mini-hex-btn style-btn has-value"
                      onClick={() => setIsStyleMenuOpen((prev) => !prev)}
                      disabled={loading || processingFiles}
                      title="Choose Summary Option"
                    >
                      <span className="mini-btn-step">2</span>
                      <div className="mini-btn-icon">
                        {summaryStyle === 'shorten' ? '📌' : summaryStyle === 'very-short' ? '⚡' : '⭐'}
                      </div>
                      <div className="mini-btn-text">
                        <strong>
                          {summaryStyle === 'shorten' ? 'Shorten' : summaryStyle === 'very-short' ? 'Very Short' : 'Key Points'}
                        </strong>
                        <small>Options ▾</small>
                      </div>
                    </button>

                    {/* Honeycomb Style Options Popover */}
                    {isStyleMenuOpen && (
                      <div className="style-popover-menu">
                        <div className="style-popover-header">🍯 Summary Options</div>
                        <button
                          type="button"
                          className={`style-option-item ${summaryStyle === 'shorten' ? 'active' : ''}`}
                          onClick={() => {
                            setSummaryStyle('shorten');
                            setIsStyleMenuOpen(false);
                          }}
                        >
                          <span className="style-option-icon">📌</span>
                          <div className="style-option-text">
                            <strong>Shorten the Notes</strong>
                            <small>Condense text while keeping full context</small>
                          </div>
                          {summaryStyle === 'shorten' && <span className="style-check">✓</span>}
                        </button>

                        <button
                          type="button"
                          className={`style-option-item ${summaryStyle === 'points' ? 'active' : ''}`}
                          onClick={() => {
                            setSummaryStyle('points');
                            setIsStyleMenuOpen(false);
                          }}
                        >
                          <span className="style-option-icon">⭐</span>
                          <div className="style-option-text">
                            <strong>Give Important Points</strong>
                            <small>Essential bullet points & key exam concepts</small>
                          </div>
                          {summaryStyle === 'points' && <span className="style-check">✓</span>}
                        </button>

                        <button
                          type="button"
                          className={`style-option-item ${summaryStyle === 'very-short' ? 'active' : ''}`}
                          onClick={() => {
                            setSummaryStyle('very-short');
                            setIsStyleMenuOpen(false);
                          }}
                        >
                          <span className="style-option-icon">⚡</span>
                          <div className="style-option-text">
                            <strong>Summarize in Very Short</strong>
                            <small>Ultra-brief 2-3 sentence TL;DR recap</small>
                          </div>
                          {summaryStyle === 'very-short' && <span className="style-check">✓</span>}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3: Summarize Notes CTA */}
                  <button
                    className="mini-hex-btn mini-hex-cta"
                    onClick={handleSummarizeNotes}
                    disabled={!canSummarize}
                    title="Summarize Notes"
                  >
                    <span className="mini-btn-step">3</span>
                    <div className="mini-btn-icon">📜</div>
                    <div className="mini-btn-text">
                      <strong>Summarize</strong>
                      <small>{processingFiles ? 'Reading...' : 'Start'}</small>
                    </div>
                  </button>
                </div>
              )}

              {/* Textarea */}
              <textarea
                rows={1}
                placeholder={
                  isFindAnswers
                    ? 'Or type your question here...'
                    : isGenerateQuiz
                    ? (quizTopic ? `Topic: "${quizTopic}". Add extra instructions or notes here...` : 'Or type your topic / paste notes here...')
                    : isSummarizeNotes
                    ? 'Or paste your notes / chapter text to summarize here...'
                    : MODES[mode].placeholder
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (isFindAnswers) handleFindAnswers();
                    else if (isGenerateQuiz) handleGenerateQuiz();
                    else if (isSummarizeNotes) handleSummarizeNotes();
                    else handleSend();
                  }
                }}
                disabled={loading || processingFiles}
              />

              {/* Send Button */}
              <button
                className="send-btn"
                onClick={
                  isFindAnswers
                    ? handleFindAnswers
                    : isGenerateQuiz
                    ? handleGenerateQuiz
                    : isSummarizeNotes
                    ? handleSummarizeNotes
                    : handleSend
                }
                disabled={
                  loading || processingFiles ||
                  (isFindAnswers ? !canFindAnswers : isGenerateQuiz ? !canGenerateQuiz : isSummarizeNotes ? !canSummarize : !input.trim())
                }
              >
                Send ➔
              </button>
            </div>
          </div>

          {/* Honey Bee Bot mascot at the bottom corner */}
          <BeeBot
            isChatting={loading || processingFiles}
            isTyping={Boolean(input.trim())}
            mode={mode}
            onQuickPrompt={handleQuickPrompt}
          />
        </div>
      </div>

      {/* ── Topic Input Honeycomb Modal ───────────────────────────────── */}
      {isTopicModalOpen && (
        <div className="topic-modal-overlay" onClick={() => setIsTopicModalOpen(false)}>
          <div className="topic-modal" onClick={(e) => e.stopPropagation()}>
            <div className="topic-modal-header">
              <div className="topic-modal-title">
                <span>🎯</span> Enter Quiz Topic
              </div>
              <button
                className="topic-modal-close"
                onClick={() => setIsTopicModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="topic-modal-desc">
              Enter any subject, chapter, or concept you want StudyBee to quiz you on:
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (tempTopicInput.trim()) {
                  setQuizTopic(tempTopicInput.trim());
                  setIsTopicModalOpen(false);
                }
              }}
            >
              <input
                type="text"
                autoFocus
                className="topic-modal-input"
                placeholder="e.g. Photosynthesis, World War II, Calculus, Cell Biology..."
                value={tempTopicInput}
                onChange={(e) => setTempTopicInput(e.target.value)}
              />

              <div className="topic-suggestions">
                <span className="topic-suggestions-label">Popular topics:</span>
                {[
                  'Photosynthesis',
                  'World War II',
                  'Calculus Derivatives',
                  'Cell Biology',
                  'Organic Chemistry',
                  'Python Basics',
                  'Microeconomics',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="topic-suggestion-tag"
                    onClick={() => setTempTopicInput(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="topic-modal-actions">
                <button
                  type="button"
                  className="topic-cancel-btn"
                  onClick={() => setIsTopicModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="topic-save-btn"
                  disabled={!tempTopicInput.trim()}
                >
                  Set Topic ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;