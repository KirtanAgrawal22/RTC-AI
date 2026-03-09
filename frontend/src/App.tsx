import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CodeEditor } from './components/CodeEditor';
import { useSocket, SocketProvider } from './contexts/SocketContext';

// Dynamic import for CustomWhiteboard to disable SSR
const CustomWhiteboard = dynamic(
  () => import('./components/CustomWhiteboard'),
  { ssr: false }
);

function Header() {
  const { roomId, createRoom, joinRoom, isConnected } = useSocket();
  const [inputRoomId, setInputRoomId] = useState('');
  const [username, setUsername] = useState('User' + Math.floor(Math.random() * 1000));

  const handleJoinRoom = () => {
    if (inputRoomId && username) {
      if (!roomId) {
        createRoom(username, inputRoomId);
      } else {
        joinRoom(username, inputRoomId);
      }
    }
  };

  return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center h-20">
      <h1 className="text-xl font-bold">Collaborative Workspace</h1>
      <div>
        <input
          type="text"
          value={inputRoomId}
          onChange={(e) => setInputRoomId(e.target.value)}
          placeholder="Enter Room ID"
          className="p-2 rounded-l text-black"
          disabled={!isConnected}
        />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="p-2 mx-2 text-black"
          disabled={!isConnected}
        />
        <button
          onClick={handleJoinRoom}
          className="bg-blue-500 text-white p-2 rounded-r"
          disabled={!isConnected}
        >
          {roomId ? 'Rejoin Room' : 'Join/Create Room'}
        </button>
        <span className="ml-4">
          Room ID: {roomId || 'Not joined'} | Status: {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </header>
  );
}

function AppContent() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [username, setUsername] = useState('User' + Math.floor(Math.random() * 1000));
  const { createRoom, joinRoom, roomId } = useSocket();

  const handleCreateRoom = (user: string) => {
    setUsername(user);
    const newRoomId = 'room-' + Math.random().toString(36).substr(2, 9);
    createRoom(user, newRoomId);
    setIsLoginModalOpen(false);
  };

  const handleJoinRoom = (user: string, room: string) => {
    setUsername(user);
    joinRoom(user, room);
    setIsLoginModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <main className="h-[calc(100vh-80px)] flex flex-col md:flex-row">
        <div className="w-full md:w-1/2 p-4">
          <CodeEditor 
            isLoginModalOpen={isLoginModalOpen}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            username={username}
            roomId={roomId}
          />
        </div>
        <div className="w-full md:w-1/2 p-4">
          <CustomWhiteboard />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}
