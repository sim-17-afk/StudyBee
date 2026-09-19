import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './Chat.css';

// Set the PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o-mini';

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

  const notesInputRef = useRef(null);
  const questionsInputRef = useRef(null);
  const quizNotesInputRef = useRef(null);
  const bottomRef = useRef(null);

  const messages = chatHistories[mode];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const addFiles = (existing, newFiles) => {
    const all = [...existing];
    for (const f of newFiles) {
      if (!all.find((e) => e.name === f.name && e.size === f.size)) all.push(f);
    }
    return all;
  };

  const isFindAnswers = mode === 'find-answers';
  const isGenerateQuiz = mode === 'generate-quiz';
  const canFindAnswers = (notesFiles.length > 0 || questionsFiles.length > 0 || input.trim()) && !loading && !processingFiles;
  const canGenerateQuiz = (Boolean(quizTopic.trim()) || quizNotesFiles.length > 0 || Boolean(input.trim())) && !loading && !processingFiles;

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
                {/* Show display label if available, else full text */}
                {(msg.displayText || msg.text).split('\n').map((line, j) => (
                  <span key={j}>{line}<br /></span>
                ))}
              </div>
            ))}
            {(loading || processingFiles) && (
              <div className="message-bubble bee loading-bubble">
                <span className="dot-flashing">
                  {processingFiles ? '📂 Reading your files...' : '🐝 thinking'}
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Find Answers Upload Panel ─────────────────────────────────── */}
          {isFindAnswers && (
            <div className="upload-panel">
              <div className="upload-panel-label">⚡ Quick Upload Workflow</div>
              <div className="upload-row">
                {/* Upload Notes */}
                <div className="upload-zone">
                  <input
                    ref={notesInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setNotesFiles((prev) => addFiles(prev, Array.from(e.target.files)))}
                    id="notes-upload"
                  />
                  <button
                    className="upload-btn notes-btn"
                    onClick={() => notesInputRef.current?.click()}
                    disabled={loading || processingFiles}
                  >
                    <span className="upload-btn-step">1</span>
                    <div className="upload-btn-icon-wrap">📚</div>
                    <strong>Upload Notes</strong>
                    <small>PDF · PPT · Images</small>
                  </button>
                  {notesFiles.length > 0 && (
                    <div className="file-chips">
                      {notesFiles.map((f, i) => (
                        <FileChip
                          key={i}
                          file={f}
                          onRemove={() => setNotesFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload Questions */}
                <div className="upload-zone">
                  <input
                    ref={questionsInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.txt,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setQuestionsFiles((prev) => addFiles(prev, Array.from(e.target.files)))}
                    id="questions-upload"
                  />
                  <button
                    className="upload-btn questions-btn"
                    onClick={() => questionsInputRef.current?.click()}
                    disabled={loading || processingFiles}
                  >
                    <span className="upload-btn-step">2</span>
                    <div className="upload-btn-icon-wrap">❓</div>
                    <strong>Upload Questions</strong>
                    <small>PDF · PPT · Images · TXT</small>
                  </button>
                  {questionsFiles.length > 0 && (
                    <div className="file-chips">
                      {questionsFiles.map((f, i) => (
                        <FileChip
                          key={i}
                          file={f}
                          onRemove={() => setQuestionsFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Find Answers */}
                <button
                  className="find-answers-btn"
                  onClick={handleFindAnswers}
                  disabled={!canFindAnswers}
                >
                  <div className="upload-btn-icon-wrap">🔍</div>
                  <strong>Find Answers</strong>
                  <small>{processingFiles ? 'Processing...' : 'Step 3 · Go!'}</small>
                </button>
              </div>
            </div>
          )}

          {/* ── Generate Quiz Panel ───────────────────────────────────────── */}
          {isGenerateQuiz && (
            <div className="upload-panel quiz-panel">
              <div className="upload-panel-label">📝 Honeycomb Quiz Creator</div>
              <div className="upload-row">
                {/* Button 1: Enter Topic */}
                <div className="upload-zone">
                  <button
                    className={`upload-btn topic-btn ${quizTopic ? 'has-value' : ''}`}
                    onClick={() => {
                      setTempTopicInput(quizTopic);
                      setIsTopicModalOpen(true);
                    }}
                    disabled={loading || processingFiles}
                  >
                    <span className="upload-btn-step">1</span>
                    <div className="upload-btn-icon-wrap">🎯</div>
                    <strong>{quizTopic ? 'Topic Set' : 'Enter Topic'}</strong>
                    <small>{quizTopic ? (quizTopic.length > 16 ? quizTopic.slice(0, 14) + '…' : quizTopic) : 'Click to Set Topic'}</small>
                  </button>
                  {quizTopic && (
                    <div className="file-chips">
                      <span className="file-chip topic-chip">
                        🎯 {quizTopic.length > 20 ? quizTopic.slice(0, 18) + '…' : quizTopic}
                        <button
                          className="file-chip-remove"
                          onClick={() => setQuizTopic('')}
                          title="Clear topic"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  )}
                </div>

                {/* Button 2: Upload Notes */}
                <div className="upload-zone">
                  <input
                    ref={quizNotesInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.txt,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setQuizNotesFiles((prev) => addFiles(prev, Array.from(e.target.files)))}
                    id="quiz-notes-upload"
                  />
                  <button
                    className="upload-btn notes-btn"
                    onClick={() => quizNotesInputRef.current?.click()}
                    disabled={loading || processingFiles}
                  >
                    <span className="upload-btn-step">2</span>
                    <div className="upload-btn-icon-wrap">📚</div>
                    <strong>Upload Notes</strong>
                    <small>PDF · PPT · Images (Optional)</small>
                  </button>
                  {quizNotesFiles.length > 0 && (
                    <div className="file-chips">
                      {quizNotesFiles.map((f, i) => (
                        <FileChip
                          key={i}
                          file={f}
                          onRemove={() => setQuizNotesFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Button 3: Generate Quiz */}
                <button
                  className="find-answers-btn generate-quiz-btn"
                  onClick={handleGenerateQuiz}
                  disabled={!canGenerateQuiz}
                >
                  <div className="upload-btn-icon-wrap">📝</div>
                  <strong>Generate Quiz</strong>
                  <small>{processingFiles ? 'Reading notes...' : 'Step 3 · Go!'}</small>
                </button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="input-area">
            <textarea
              rows={2}
              placeholder={
                isFindAnswers
                  ? 'Or type your question here...'
                  : isGenerateQuiz
                  ? (quizTopic ? `Topic is "${quizTopic}". Add extra instructions or paste notes here...` : 'Or type your topic / paste notes here...')
                  : MODES[mode].placeholder
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (isFindAnswers) handleFindAnswers();
                  else if (isGenerateQuiz) handleGenerateQuiz();
                  else handleSend();
                }
              }}
              disabled={loading || processingFiles}
            />
            <button
              className="send-btn"
              onClick={isFindAnswers ? handleFindAnswers : isGenerateQuiz ? handleGenerateQuiz : handleSend}
              disabled={
                loading || processingFiles ||
                (isFindAnswers ? !canFindAnswers : isGenerateQuiz ? !canGenerateQuiz : !input.trim())
              }
            >
              {loading || processingFiles ? '...' : 'Send ➔'}
            </button>
          </div>
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