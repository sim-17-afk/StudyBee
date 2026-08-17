import { useState } from 'react';
import Login from './Login';
import Home from './Home';
import Chat from './Chat';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState('dashboard'); // Tracks 'dashboard' or 'chat'

  // Function to handle a clean logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setScreen('dashboard'); // Reset the screen so the next login starts fresh
  };

  // 1. Show Login if not authenticated
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  // 2. Show Home Dashboard
  if (screen === 'dashboard') {
    return (
      <Home 
        onLogout={handleLogout} 
        onSelectFeature={() => setScreen('chat')} 
      />
    );
  }

  // 3. Show Chat UI
  if (screen === 'chat') {
    return <Chat onBack={() => setScreen('dashboard')} />;
  }

  return null; // Fallback
}

export default App;