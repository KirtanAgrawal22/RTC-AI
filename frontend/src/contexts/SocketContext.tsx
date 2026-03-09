"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface User {
  id: string;
  username: string;
}

interface ChatMessage {
  user: string;
  message: string;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  roomId: string | null;
  users: User[];
  chatMessages: ChatMessage[];
  isConnected: boolean;
  createRoom: (username: string, roomId: string) => void;
  joinRoom: (username: string, roomId: string) => void;
  sendChatMessage: (roomId: string, message: string) => void;
  requestChatHistory: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = io("https://rtc-ai.onrender.com/", {
      autoConnect: true,
      reconnection: true,
    });

    setSocket(s);

    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));

    s.on("users-update", (usersList: User[]) => {
      setUsers(usersList || []);
    });

    s.on("room-created", (data) => {
      setRoomId(data.roomId);
      setUsers(data.users || []);
      setChatMessages([]); // new room = new chat
    });

    s.on("room-joined", (data) => {
      setRoomId(data.roomId);
      setUsers(data.users || []);
      setChatMessages(data.chat || []);
    });

    // 🔥 REAL-TIME CHAT
    s.on("chat-message", (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    s.on("chat-history", (history: ChatMessage[]) => {
      setChatMessages(history || []);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const createRoom = (username: string, roomId: string) => {
    socket?.emit("createRoom", { username, roomId });
  };

  const joinRoom = (username: string, roomId: string) => {
    socket?.emit("joinRoom", { username, roomId });
  };

  const sendChatMessage = (roomId: string, message: string) => {
    socket?.emit("chat-message", { roomId, message });
  };

  const requestChatHistory = (roomId: string) => {
    socket?.emit("request-chat-history", { roomId });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        roomId,
        users,
        chatMessages,
        isConnected,
        createRoom,
        joinRoom,
        sendChatMessage,
        requestChatHistory,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
