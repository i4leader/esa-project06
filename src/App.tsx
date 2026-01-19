import React, { useState } from 'react';
import { MeetingPanel } from './components/MeetingPanel';
import './App.css';

function App() {
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    // Generate a unique session ID
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  const handleSessionChange = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  return (
    <div className="App">
      <MeetingPanel 
        sessionId={currentSessionId}
        onSessionChange={handleSessionChange}
      />
    </div>
  );
}

export default App;