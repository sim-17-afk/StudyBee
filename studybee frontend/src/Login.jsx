import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);

  return (
    <div className="login-container">
      {/* The bumpy, cartoon-style honey drip at the very top */}
      <div className="honey-ceiling-drip"></div>

      {/* These divs are styled as large, gooey droplets in the CSS */}
      <div className="honey-drop"></div>
      <div className="honey-drop"></div>
      <div className="honey-drop"></div>
      <div className="honey-drop"></div>
      <div className="honey-drop"></div>
      <div className="honey-drop"></div>
      <div className="honey-drop"></div>

      <div className="honey-card">
        <h2 className="honey-title">
          Study<span className="bee-span">Bee</span>
        </h2>
        <p className="subtitle">
          {isSignup ? 'Create your Hive Account' : 'Welcome to the Hive'}
        </p>
        
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="input-box">
            <input type="email" placeholder="Student Email" required />
          </div>
          <div className="input-box">
            <input type="password" placeholder="Password" required />
          </div>
          <button type="submit" className="login-btn" onClick={onLogin}>
            {isSignup ? 'Start Learning' : 'Log In'}
          </button>
        </form>
        
        <p className="toggle-text">
          {isSignup ? "Already working?" : "New to the hive?"} 
          <span onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? ' Go to Login' : ' Join Us'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;