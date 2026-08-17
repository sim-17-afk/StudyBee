import React, { useState } from 'react';
import './Chat.css';

const Chat = ({ onBack }) => {
  const [messages, setMessages] = useState([
    { role: 'bee', text: "Bzzzt! I'm your AI Bee. Upload a PDF or ask me anything about your studies!" }
  ]);
  const [input, setInput] = useState('');

  



const handleSend = async () => {
  if (!input.trim()) return;
  
  const userMsg = { role: 'user', text: input };
  setMessages(prev => [...prev, userMsg]);
  setInput('');

  try {
    // Calling your local backend
    const response = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
    });

    const data = await response.json();
    
    // Add the Bee's real AI response
    setMessages(prev => [...prev, { role: 'bee', text: data.reply }]);
  } catch (error) {
    setMessages(prev => [...prev, { role: 'bee', text: "Bzzzt! My wings are tired. Check your connection!" }]);
  }
};



  return (
    <div className="chat-page">
      <div className="chat-sidebar">
        <div className="sidebar-logo">Study<span>Bee</span></div>
        <button className="side-item active">🐝 AI Bee</button>
        <button className="side-item">🔍 Find Answers</button>
        <button className="side-item">📝 Quiz Gen</button>
        <button className="side-item">📜 Summarizer</button>
        <button className="back-btn" onClick={onBack}>← Dashboard</button>
      </div>

      <div className="chat-main">
        <div className="chat-window">
          <div className="messages-container">
            {messages.map((msg, i) => (
              <div key={i} className={`message-bubble ${msg.role}`}>
                {msg.text}
              </div>
            ))}
          </div>
          
          <div className="input-area">
            <input 
              type="text" 
              placeholder="Ask the Bee..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend}>Send ➔</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;