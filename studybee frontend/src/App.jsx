import { useState } from 'react';
import Login from './Login';
import Home from './Home';
import Chat from './Chat';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState('dashboard');
  const [activeFeature, setActiveFeature] = useState('ai-bee');

  const handleLogout = () => {
    setIsLoggedIn(false);
    setScreen('dashboard');
  };

  const handleSelectFeature = (featureId) => {
    setActiveFeature(featureId);
    setScreen('chat');
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
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