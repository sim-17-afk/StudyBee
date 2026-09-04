import { useState } from 'react';
import Login from './Login';
import Home from './Home';
import Chat from './Chat';
import './App.css';

function App() {
  // Persist login state across refreshes
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('studybee_session') === 'true'
  );
  const [screen, setScreen] = useState('dashboard');
  const [activeFeature, setActiveFeature] = useState('ai-bee');

  const handleLogin = (email) => {
    localStorage.setItem('studybee_session', 'true');
    localStorage.setItem('studybee_current_user', email);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('studybee_session');
    localStorage.removeItem('studybee_current_user');
    setIsLoggedIn(false);
    setScreen('dashboard');
  };

  const handleSelectFeature = (featureId) => {
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
      />
    );
  }

  if (screen === 'chat') {
    return (
      <Chat
        onBack={() => setScreen('dashboard')}
        initialMode={activeFeature}
      />
    );
  }

  return null;
}

export default App;