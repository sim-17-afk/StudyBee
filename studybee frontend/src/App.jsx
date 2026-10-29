import { useState, useEffect } from 'react';
import Login from './Login';
import Home from './Home';
import Chat from './Chat';
import ProgressDashboard from './Dashboard';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('studybee_session') === 'true'
  );
  const [screen, setScreen] = useState(
    () => localStorage.getItem('studybee_screen') || 'dashboard'
  );
  const [activeFeature, setActiveFeature] = useState(
    () => localStorage.getItem('studybee_feature') || 'ai-bee'
  );
  const [streak, setStreak] = useState(
    () => parseInt(localStorage.getItem('studybee_streak'), 10) || 1
  );

  // Current user email (used for dashboard API auth header)
  const userEmail = localStorage.getItem('studybee_current_user') || '';

  // Record daily streak whenever app is opened and user is logged in
  useEffect(() => {
    if (!isLoggedIn || !userEmail) return;

    const now = new Date();
    const clientDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const apiBase = import.meta.env.VITE_API_URL || '';
    fetch(`${apiBase}/api/user/record-streak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      body: JSON.stringify({ clientDate }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.streak) {
          setStreak(data.streak);
          localStorage.setItem('studybee_streak', String(data.streak));
        }
      })
      .catch(() => {});
  }, [isLoggedIn, userEmail]);

  const handleLogin = (email, userStreak = 1) => {
    localStorage.setItem('studybee_session', 'true');
    localStorage.setItem('studybee_current_user', email);
    localStorage.setItem('studybee_streak', String(userStreak));
    setStreak(userStreak);
    setIsLoggedIn(true);
    setScreen('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('studybee_session');
    localStorage.removeItem('studybee_current_user');
    localStorage.removeItem('studybee_screen');
    localStorage.removeItem('studybee_feature');
    localStorage.removeItem('studybee_streak');
    setIsLoggedIn(false);
    setScreen('dashboard');
  };

  const goTo = (newScreen) => {
    localStorage.setItem('studybee_screen', newScreen);
    setScreen(newScreen);
  };

  const handleSelectFeature = (featureId) => {
    localStorage.setItem('studybee_feature', featureId);
    localStorage.setItem('studybee_screen', 'chat');
    setActiveFeature(featureId);
    setScreen('chat');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (screen === 'dashboard') {
    return (
      <Home
        onLogout={handleLogout}
        onSelectFeature={handleSelectFeature}
        onViewProgress={() => goTo('progress')}
        streak={streak}
      />
    );
  }

  if (screen === 'chat') {
    return (
      <Chat
        onBack={() => goTo('dashboard')}
        initialMode={activeFeature}
        userEmail={userEmail}
      />
    );
  }

  if (screen === 'progress') {
    return (
      <ProgressDashboard
        onBack={() => goTo('dashboard')}
        userEmail={userEmail}
      />
    );
  }

  return null;
}

export default App;