import React, { useState, useEffect, useRef } from 'react';

const BEE_TIPS = [
  "Bzzzt! I'm BeeBot — your 24/7 study buddy! 🐝",
  "Tip: Ask me to break difficult topics into easy steps! 🧠",
  "Study hack: 25 mins focus + 5 mins break = Honey sweet results! ⏱️",
  "Need a quick test? Tell me to quiz you on any chapter! 📝",
  "Don't forget to stay hydrated while studying! 🌻",
  "Bzzzt! You're doing amazing — keep buzzing forward! 💛",
  "Tip: You can upload your PDF notes and I'll find the answers for you! 📚",
];

const CHATTING_MESSAGES = [
  "Bzzzt! Thinking hard... 🍯",
  "Gathering sweet answers... ✨",
  "Pollinating your notes... 🐝",
  "Buzzing through knowledge! 💡",
  "Extracting pure wisdom... 🍯",
  "Almost ready, study bee! 🌟",
];

export default function BeeBot({ isChatting, isTyping, mode, onQuickPrompt }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [chattingMsgIndex, setChattingMsgIndex] = useState(0);
  const [isBubbleOpen, setIsBubbleOpen] = useState(false);
  const [isPopping, setIsPopping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const bubbleTimeoutRef = useRef(null);

  // Rotate chatting message while AI is thinking/loading
  useEffect(() => {
    let interval = null;
    if (isChatting) {
      setIsBubbleOpen(true);
      interval = setInterval(() => {
        setChattingMsgIndex((prev) => (prev + 1) % CHATTING_MESSAGES.length);
      }, 2200);
    } else {
      if (interval) clearInterval(interval);
      // Auto-hide bubble shortly after chatting finishes if user didn't open it manually
      const timer = setTimeout(() => {
        setIsBubbleOpen(false);
      }, 2800);
      return () => clearTimeout(timer);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isChatting]);

  // When clicking the Bee Bot: trigger energetic pop and show next tip
  const handleBeeClick = () => {
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 600);

    setTipIndex((prev) => (prev + 1) % BEE_TIPS.length);
    setIsBubbleOpen(true);

    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => {
      setIsBubbleOpen(false);
    }, 7000);
  };

  // Close speech bubble
  const handleCloseBubble = (e) => {
    e.stopPropagation();
    setIsBubbleOpen(false);
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
  };

  // Current bubble text
  const currentText = isChatting
    ? CHATTING_MESSAGES[chattingMsgIndex]
    : BEE_TIPS[tipIndex];

  // Accessory per mode
  const renderAccessory = () => {
    if (mode === 'ai-bee') {
      // Golden Little Crown
      return (
        <g className="bee-accessory-crown" transform="translate(48, 12)">
          <path
            d="M2 14 L7 3 L12 10 L17 3 L22 14 Z"
            fill="url(#goldCrownGrad)"
            stroke="#9E6200"
            strokeWidth="1.2"
          />
          <circle cx="7" cy="3" r="1.5" fill="#FF1744" />
          <circle cx="12" cy="10" r="1.3" fill="#00E5FF" />
          <circle cx="17" cy="3" r="1.5" fill="#FFD700" />
        </g>
      );
    }
    if (mode === 'find-answers') {
      // Mini Magnifying Glass
      return (
        <g className="bee-accessory-lens" transform="translate(74, 52) rotate(15)">
          <circle cx="9" cy="9" r="8" fill="rgba(180, 235, 255, 0.65)" stroke="#6D4C41" strokeWidth="2" />
          <line x1="15" y1="15" x2="24" y2="24" stroke="#5D4037" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="7" cy="7" r="2.5" fill="#FFFFFF" opacity="0.8" />
        </g>
      );
    }
    if (mode === 'generate-quiz') {
      // Tiny Pencil
      return (
        <g className="bee-accessory-pencil" transform="translate(74, 48) rotate(-20)">
          <rect x="0" y="4" width="18" height="6" rx="1.5" fill="#FFD54F" stroke="#E65100" strokeWidth="1" />
          <polygon points="18,4 25,7 18,10" fill="#FFE082" stroke="#E65100" strokeWidth="0.8" />
          <polygon points="23,6 25,7 23,8" fill="#3E2723" />
          <rect x="-4" y="4" width="4" height="6" rx="1" fill="#FF8A80" />
        </g>
      );
    }
    if (mode === 'summarize-notes') {
      // Tiny Scroll
      return (
        <g className="bee-accessory-scroll" transform="translate(74, 50)">
          <rect x="0" y="0" width="16" height="12" rx="3" fill="#FFF8E1" stroke="#FFA000" strokeWidth="1.2" />
          <line x1="3" y1="4" x2="13" y2="4" stroke="#FFB300" strokeWidth="1.2" />
          <line x1="3" y1="7" x2="11" y2="7" stroke="#FFB300" strokeWidth="1.2" />
          <line x1="3" y1="10" x2="8" y2="10" stroke="#FFB300" strokeWidth="1.2" />
        </g>
      );
    }
    return null;
  };

  return (
    <div
      className={`bee-bot-wrapper ${isChatting ? 'is-chatting' : ''} ${isTyping ? 'is-typing' : ''} ${isPopping ? 'is-popping' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Speech / Thought Bubble */}
      {(isBubbleOpen || isHovered) && (
        <div className={`bee-speech-bubble ${isChatting ? 'thought-mode' : 'talk-mode'}`}>
          <div className="bee-speech-content">
            <span className="bee-speech-icon">{isChatting ? '⚡' : '🐝'}</span>
            <span className="bee-speech-text">{currentText}</span>
          </div>
          {!isChatting && (
            <button
              className="bee-speech-close"
              onClick={handleCloseBubble}
              title="Close"
              type="button"
            >
              ×
            </button>
          )}
          <div className="bee-speech-tail" />
        </div>
      )}

      {/* Interactive Bee Avatar Button */}
      <button
        type="button"
        className="bee-bot-btn"
        onClick={handleBeeClick}
        title="Click to interact with StudyBee! 🐝"
        aria-label="StudyBee Mascot Bot"
      >
        {/* Floating sparkles when chatting or popped */}
        {(isChatting || isPopping) && (
          <div className="bee-bot-sparkles">
            <span className="sparkle s1">✨</span>
            <span className="sparkle s2">🍯</span>
            <span className="sparkle s3">⭐</span>
          </div>
        )}

        <svg
          className="bee-bot-svg"
          viewBox="0 0 120 120"
          width="74"
          height="74"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Body Honey Gradient */}
            <linearGradient id="beeBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF176" />
              <stop offset="40%" stopColor="#FFD54F" />
              <stop offset="85%" stopColor="#FFB300" />
              <stop offset="100%" stopColor="#FFA000" />
            </linearGradient>

            {/* Pearlescent Wing Gradient */}
            <linearGradient id="beeWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
              <stop offset="60%" stopColor="rgba(224, 247, 250, 0.8)" />
              <stop offset="100%" stopColor="rgba(178, 235, 242, 0.65)" />
            </linearGradient>

            {/* Crown Gold Gradient */}
            <linearGradient id="goldCrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="50%" stopColor="#FFCA28" />
              <stop offset="100%" stopColor="#FF8F00" />
            </linearGradient>

            {/* Soft Shadow Filter */}
            <filter id="beeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#FF8F00" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Dynamic Ground Shadow */}
          <ellipse
            className="bee-ground-shadow"
            cx="60"
            cy="112"
            rx="24"
            ry="5"
            fill="rgba(220, 140, 0, 0.22)"
          />

          {/* Animated Bee Group */}
          <g className="bee-char-group" filter="url(#beeGlow)">
            {/* Left Wing */}
            <g className="bee-wing bee-wing-left">
              <ellipse
                cx="42"
                cy="42"
                rx="15"
                ry="22"
                fill="url(#beeWingGrad)"
                stroke="#80DEEA"
                strokeWidth="1.2"
                transform="rotate(-28 42 42)"
              />
              <path
                d="M42 22 Q44 38 42 54"
                stroke="rgba(128, 222, 234, 0.6)"
                strokeWidth="1"
                fill="none"
              />
            </g>

            {/* Right Wing */}
            <g className="bee-wing bee-wing-right">
              <ellipse
                cx="78"
                cy="42"
                rx="15"
                ry="22"
                fill="url(#beeWingGrad)"
                stroke="#80DEEA"
                strokeWidth="1.2"
                transform="rotate(28 78 42)"
              />
              <path
                d="M78 22 Q76 38 78 54"
                stroke="rgba(128, 222, 234, 0.6)"
                strokeWidth="1"
                fill="none"
              />
            </g>

            {/* Stinger */}
            <path
              d="M56 88 Q60 102 60 102 Q60 102 64 88 Z"
              fill="#2E1C0C"
              stroke="#2E1C0C"
              strokeLinejoin="round"
            />

            {/* Bee Main Body */}
            <ellipse
              cx="60"
              cy="65"
              rx="31"
              ry="26"
              fill="url(#beeBodyGrad)"
              stroke="#D78900"
              strokeWidth="1.5"
            />

            {/* Honeycomb Stripes (Curved) */}
            <path
              d="M37 60 Q60 66 83 60 Q85 67 82 72 Q60 78 38 72 Z"
              fill="#2E1C0C"
              opacity="0.92"
            />
            <path
              d="M43 77 Q60 82 77 77 Q78 83 75 86 Q60 90 45 86 Z"
              fill="#2E1C0C"
              opacity="0.92"
            />

            {/* Honey Shimmer on Head */}
            <ellipse
              cx="52"
              cy="48"
              rx="12"
              ry="5"
              fill="#FFFFFF"
              opacity="0.45"
              transform="rotate(-15 52 48)"
            />

            {/* Antennae */}
            {/* Left Antenna */}
            <path
              d="M50 42 Q40 24 34 26"
              fill="none"
              stroke="#2E1C0C"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="33" cy="26" r="3.5" fill="#FFC107" stroke="#2E1C0C" strokeWidth="1" />

            {/* Right Antenna */}
            <path
              d="M70 42 Q80 24 86 26"
              fill="none"
              stroke="#2E1C0C"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="87" cy="26" r="3.5" fill="#FFC107" stroke="#2E1C0C" strokeWidth="1" />

            {/* Eyes */}
            {isChatting ? (
              // Happy sparkling eyes when chatting
              <g className="bee-eyes happy-eyes">
                <path
                  d="M45 57 Q51 51 57 57"
                  fill="none"
                  stroke="#2E1C0C"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <path
                  d="M63 57 Q69 51 75 57"
                  fill="none"
                  stroke="#2E1C0C"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              // Big cute anime eyes with gloss
              <g className="bee-eyes standard-eyes">
                {/* Left eye */}
                <ellipse cx="51" cy="56" rx="5" ry="6.5" fill="#241505" />
                <circle cx="49" cy="53.5" r="2.2" fill="#FFFFFF" />
                <circle cx="53" cy="58" r="1.1" fill="#FFFFFF" />

                {/* Right eye */}
                <ellipse cx="69" cy="56" rx="5" ry="6.5" fill="#241505" />
                <circle cx="67" cy="53.5" r="2.2" fill="#FFFFFF" />
                <circle cx="71" cy="58" r="1.1" fill="#FFFFFF" />
              </g>
            )}

            {/* Rosy Honey Cheeks */}
            <ellipse cx="42" cy="63" rx="4.5" ry="3" fill="#FF80AB" opacity="0.65" />
            <ellipse cx="78" cy="63" rx="4.5" ry="3" fill="#FF80AB" opacity="0.65" />

            {/* Cute Smile */}
            <path
              d="M56 63 Q60 67 64 63"
              fill="none"
              stroke="#2E1C0C"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Mode-specific accessory */}
            {renderAccessory()}
          </g>
        </svg>

        {/* Small "Buzz!" badge on hover */}
        <span className="bee-bot-tag">
          {isChatting ? 'Buzzing...' : 'BeeBot 🍯'}
        </span>
      </button>
    </div>
  );
}
