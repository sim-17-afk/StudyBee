import React, { useState } from 'react';
import './Login.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Local storage helpers ─────────────────────────────────────────────────────
const getUsers = () => JSON.parse(localStorage.getItem('studybee_users') || '{}');
const saveUsers = (users) => localStorage.setItem('studybee_users', JSON.stringify(users));

const Login = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

  const validate = () => {
    const errs = {};
    if (!email) {
      errs.email = 'Email is required.';
    } else if (!emailRegex.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    } else if (isSignup && password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    setLoading(true);

    // Small delay to feel responsive
    setTimeout(() => {
      const key = email.trim().toLowerCase();
      const users = getUsers();

      if (isSignup) {
        // ── Register ──
        if (users[key]) {
          setErrors({ server: 'An account with this email already exists.' });
          setLoading(false);
          return;
        }
        users[key] = { email: key, password };
        saveUsers(users);
        onLogin(key);
      } else {
        // ── Login ──
        const user = users[key];
        if (!user || user.password !== password) {
          setErrors({ server: 'Invalid email or password.' });
          setLoading(false);
          return;
        }
        onLogin(key);
      }
    }, 400);
  };

  const switchMode = () => {
    setIsSignup(!isSignup);
    setErrors({});
    setEmail('');
    setPassword('');
    setShowPass(false);
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="honey-ceiling-drip"></div>
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

        {errors.server && (
          <div className="error-banner">{errors.server}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className={`input-box ${errors.email ? 'has-error' : ''}`}>
            <input
              id="auth-email"
              type="email"
              placeholder="Student Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className={`input-box password-box ${errors.password ? 'has-error' : ''}`}>
            <input
              id="auth-password"
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
            {isSignup && (
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            )}
            {errors.password && <span className="field-error">{errors.password}</span>}
            {isSignup && !errors.password && (
              <span className="pass-hint">Minimum 8 characters</span>
            )}
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? '🐝 Buzzing...' : isSignup ? 'Start Learning' : 'Log In'}
          </button>
        </form>

        <p className="toggle-text">
          {isSignup ? 'Already working?' : 'New to the hive?'}{' '}
          <span onClick={switchMode}>
            {isSignup ? ' Go to Login' : ' Join Us'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;