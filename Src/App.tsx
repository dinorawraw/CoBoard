import React, { useState } from 'react';
import { RoomAccess } from './components/RoomAccess';
import { Board } from './components/Board';
import { ViewerBoard } from './components/ViewerBoard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isViewerMode = window.location.pathname === '/view';

  const handleJoinRoom = (nickname: string, roomKey: string) => {
    // Here we would normally authenticate with the backend
    setIsAuthenticated(true);
  };

  if (isViewerMode) {
    return <ViewerBoard />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {!isAuthenticated ? (
        <RoomAccess onJoin={handleJoinRoom} />
      ) : (
        <Board />
      )}
    </div>
  );
}

export default App;