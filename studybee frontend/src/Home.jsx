import React from 'react';
import './Home.css';

// 1. Added 'onSelectFeature' to the props here
const Home = ({ onLogout, onSelectFeature }) => {
  const features = [
    { id: 1, title: 'Find Answers', icon: '🔍', desc: 'Scan your PDFs for instant solutions.' },
    { id: 2, title: 'Generate Quiz', icon: '📝', desc: 'Turn your notes into practice tests.' },
    { id: 3, title: 'Summarize Notes', icon: '📜', desc: 'Shorten long chapters into key points.' },
    { id: 4, title: 'AI Bee', icon: '🐝', desc: 'Chat with your personal study assistant.' },
  ];

  return (
    <div className="home-container">
      {/* Decorative Honey Drip at the top */}
      <div className="home-drip"></div>
      
      <nav className="home-nav">
        <h1 className="home-logo">Study<span>Bee</span></h1>
        <button className="logout-link" onClick={onLogout}>Exit Hive</button>
      </nav>

      <main className="dashboard">
        <h2 className="welcome-text">What are we learning today?</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div key={f.id} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              
              {/* 2. Added onClick to the button to trigger the screen change */}
              <button className="go-btn" onClick={onSelectFeature}>
                Start →
              </button>    
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Home;