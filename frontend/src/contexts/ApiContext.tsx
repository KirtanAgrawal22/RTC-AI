'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface User {
  id: string;
  username: string;
}

interface RoomData {
  users: User[];
  code: string;
  language: string;
  whiteboard: any;
  flowchart: any;
}

interface ApiContextType {
  createRoom: (username: string, roomId: string) => Promise<any>;
  joinRoom: (username: string, roomId: string) => Promise<any>;
  updateCode: (roomId: string, code: string, language?: string) => Promise<any>;
  updateWhiteboard: (roomId: string, whiteboard: any) => Promise<any>;
  updateFlowchart: (roomId: string, flowchart: any) => Promise<any>;
  getRoom: (roomId: string) => Promise<RoomData>;
  currentRoom: string | null;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const createRoom = async (username: string, roomId: string) => {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', roomId, username })
    });
    const data = await response.json();
    if (data.success) {
      setCurrentRoom(roomId);
    }
    return data;
  };

  const joinRoom = async (username: string, roomId: string) => {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', roomId, username })
    });
    const data = await response.json();
    if (data.success) {
      setCurrentRoom(roomId);
    }
    return data;
  };

  const updateCode = async (roomId: string, code: string, language?: string) => {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'update', 
        roomId, 
        code, 
        language 
      })
    });
    return response.json();
  };

  const updateWhiteboard = async (roomId: string, whiteboard: any) => {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'update', 
        roomId, 
        whiteboard
      })
    });
    return response.json();
  };

  const updateFlowchart = async (roomId: string, flowchart: any) => {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'update', 
        roomId, 
        flowchart
      })
    });
    return response.json();
  };

  const getRoom = async (roomId: string): Promise<RoomData> => {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', roomId })
    });
    const data = await response.json();
    return data.success ? data.data : null;
  };

  // Polling for real-time updates
  const startPolling = useCallback((roomId: string, onUpdate: (data: RoomData) => void) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      const roomData = await getRoom(roomId);
      if (roomData) {
        onUpdate(roomData);
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);
  }, [pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return (
    <ApiContext.Provider value={{
      createRoom,
      joinRoom,
      updateCode,
      updateWhiteboard,
      updateFlowchart,
      getRoom,
      currentRoom
    }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
