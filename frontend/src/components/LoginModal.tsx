"use client";

import { useState, useEffect } from 'react';
import { X, User, Key, Plus, Users } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onJoinRoom: (username: string, roomId: string) => void;
  onCreateRoom: (username: string) => void;
  /** When set (e.g. from invite link ?room=XXX), pre-fill room ID and show Join tab */
  initialRoomId?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onJoinRoom, onCreateRoom, initialRoomId }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('create');

  // When opened with an invite link (?room=XXX), pre-fill room and switch to Join tab
  useEffect(() => {
    if (isOpen && initialRoomId?.trim()) {
      setRoomId(initialRoomId.trim());
      setActiveTab('join');
    }
  }, [isOpen, initialRoomId]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && roomId.trim()) {
      onJoinRoom(username, roomId);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onCreateRoom(username);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Join CollabCode Canvas</h2>
          <button className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex mb-4 border-b border-gray-600">
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'create' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('create')}
          >
            <Plus size={16} className="inline mr-1" />
            Create Room
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'join' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveTab('join')}
          >
            <Users size={16} className="inline mr-1" />
            Join Room
          </button>
        </div>
        
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Your Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>
            
            <div className="bg-gray-700 p-3 rounded-md">
              <p className="text-sm text-gray-300">
                A new room ID will be automatically generated for you to share with others.
              </p>
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
            >
              Create New Room
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Your Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Room ID
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter room ID"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Get the room ID from your collaborator
              </p>
            </div>
            
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition-colors"
            >
              Join Room
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginModal;