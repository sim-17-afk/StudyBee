import React from 'react';
import './Home.css';

const Home = ({ onLogout, onSelectFeature }) => {
  const features = [
    {
      id: 'find-answers',
      title: 'Find Answers',
      icon: '🔍',
      desc: 'Scan your PDFs for instant solutions.',
    },
    {
      id: 'generate-quiz',
      title: 'Generate Quiz',
      icon: '📝',
      desc: 'Turn your notes into practice tests.',
    },
    {
      id: 'summarize-notes',
      title: 'Summarize Notes',
      icon: '📜',
      desc: 'Shorten long chapters into key points.',
    },
    {
      id: 'ai-bee',
      title: 'AI Bee',
      icon: '🐝',
      desc: 'Chat with your personal study assistant.',
    },
  ];

  return (
    <div className="home-container">
      {/* Top dripping honey bar */}
      <svg className="home-drip" viewBox="0 0 1440 90" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="honeyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFC82C" />
            <stop offset="55%" stopColor="#FFB300" />
            <stop offset="100%" stopColor="#FF9100" />
          </linearGradient>
        </defs>
        <path
          d="M 0 0 L 0 32 C 35 32, 65 30, 80 44 C 88 52, 85 70, 100 70 C 115 70, 112 52, 120 44 C 135 30, 165 32, 195 32 C 215 32, 225 40, 240 40 C 255 40, 265 32, 280 32 C 290 32, 292 48, 295 56 C 297 64, 295 76, 305 76 C 315 76, 313 64, 315 56 C 318 48, 325 30, 350 30 C 380 30, 405 38, 425 38 C 445 38, 470 28, 490 28 C 505 28, 508 44, 510 54 C 512 64, 510 74, 520 74 C 530 74, 528 64, 530 54 C 532 44, 545 32, 575 32 C 605 32, 625 46, 640 46 C 655 46, 675 30, 705 30 C 720 30, 722 48, 724 60 C 726 72, 722 84, 735 84 C 748 84, 744 72, 746 60 C 748 48, 755 30, 785 30 C 815 30, 840 40, 860 40 C 880 40, 905 30, 925 30 C 938 30, 940 46, 942 56 C 944 66, 940 76, 952 76 C 964 76, 960 66, 962 56 C 964 46, 975 32, 1010 32 C 1035 32, 1055 42, 1075 42 C 1095 42, 1110 30, 1125 30 C 1130 30, 1132 46, 1133 58 C 1134 70, 1130 80, 1142 80 C 1154 80, 1150 70, 1151 58 C 1152 46, 1165 30, 1195 30 C 1215 30, 1235 38, 1250 38 C 1258 38, 1260 50, 1262 58 C 1264 66, 1260 74, 1270 74 C 1280 74, 1276 66, 1278 58 C 1280 50, 1295 32, 1320 32 C 1340 32, 1355 42, 1360 52 C 1364 62, 1360 72, 1370 72 C 1380 72, 1376 62, 1380 52 C 1384 42, 1405 32, 1440 30 L 1440 0 Z"
          fill="url(#honeyGrad)"
        />
        {/* Subtle glossy highlight layer along top curves */}
        <path
          d="M 0 6 L 0 20 C 40 20, 70 24, 90 34 C 110 24, 150 20, 200 20 C 250 20, 280 24, 300 36 C 320 24, 370 18, 430 18 C 480 18, 500 22, 515 34 C 535 22, 580 20, 640 20 C 690 20, 715 24, 730 40 C 750 24, 800 18, 860 18 C 910 18, 935 22, 948 36 C 965 24, 1010 20, 1070 20 C 1110 20, 1125 24, 1138 38 C 1155 24, 1200 20, 1250 20 C 1290 20, 1330 22, 1365 34 C 1390 24, 1420 20, 1440 20 L 1440 6 Z"
          fill="rgba(255, 255, 255, 0.35)"
        />
      </svg>

      {/* Little falling honey drops */}
      <div className="home-honey-drop drop-1"></div>
      <div className="home-honey-drop drop-2"></div>
      <div className="home-honey-drop drop-3"></div>
      <div className="home-honey-drop drop-4"></div>
      <div className="home-honey-drop drop-5"></div>
      <div className="home-honey-drop drop-6"></div>
      <div className="home-honey-drop drop-7"></div>
      <div className="home-honey-drop drop-8"></div>

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
              <button className="go-btn" onClick={() => onSelectFeature(f.id)}>
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