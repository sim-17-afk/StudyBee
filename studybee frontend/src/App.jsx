import { useState } from 'react';
import Login from './Login';
import Home from './Home';
import Chat from './Chat';
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

  const handleLogin = (email) => {
    localStorage.setItem('studybee_session', 'true');
    localStorage.setItem('studybee_current_user', email);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('studybee_session');
    localStorage.removeItem('studybee_current_user');
    localStorage.removeItem('studybee_screen');
    localStorage.removeItem('studybee_feature');
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
      />
    );
  }

  if (screen === 'chat') {
    return (
      <Chat
        onBack={() => goTo('dashboard')}
        initialMode={activeFeature}
      />
    );
  }

  return null;
}

export default App;