"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CodeEditor } from "@/components/CodeEditor";
import { WhiteboardWrapper } from "@/components/WhiteboardWrapper";
import { isShareUrl } from "@/lib/shareUtils";
import { useSocket } from "@/contexts/SocketContext";
import RoomChat from "@/components/RoomChat";
import UserList from "@/components/UserList";
import VideoCall from '@/components/VideoCall';

export default function Home() {
  const [activeTab, setActiveTab] = useState<"editor" | "whiteboard">("editor");
  const [isSplitView, setIsSplitView] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    createRoom,
    joinRoom,
    users,
    chatMessages,
    sendChatMessage,
    requestChatHistory,
  } = useSocket();

  useEffect(() => {
    const roomFromUrl = searchParams.get("room");
    if (roomFromUrl?.trim()) {
      setRoomId(roomFromUrl.trim());
      setIsLoginModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isShareUrl()) {
      router.push(window.location.pathname);
    }
  }, [router]);

  useEffect(() => {
    if (roomId) {
      requestChatHistory(roomId);
    }
  }, [roomId, requestChatHistory]);

  const handleCreateRoom = (name: string) => {
    setUsername(name);
    const newRoomId = Math.random().toString(36).substring(2, 8);
    setRoomId(newRoomId);
    setIsLoginModalOpen(false);
    createRoom(name, newRoomId);
  };

  const handleJoinRoom = (name: string, room: string) => {
    setUsername(name);
    setRoomId(room);
    setIsLoginModalOpen(false);
    joinRoom(name, room);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="p-4 bg-gray-800 border-b border-gray-700">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold">CollabCode Canvas</h1>
      <p className="text-gray-400">Code + Custom Whiteboard</p>
    </div>

    <div className="flex items-center gap-4">
      {/* Split View Toggle */}
      <button
        onClick={() => setIsSplitView(!isSplitView)}
        className={`px-4 py-2 rounded ${
          isSplitView ? "bg-blue-600" : "bg-gray-600"
        }`}
      >
        {isSplitView ? "Single View" : "Split View"}
      </button>

      {/* Code Visualizer Button */}
  <button
    onClick={() =>
      window.open("https://code-visualizer-gzjp.onrender.com/", "_blank")
    }
    className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700"
  >
    📊 Visualizer
  </button>

      {/* Editor / Whiteboard Toggle */}
      <div className="flex bg-gray-700 rounded">
        <button
          onClick={() => setActiveTab("editor")}
          className={`px-4 py-2 rounded ${
            activeTab === "editor" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          💻 Code Editor
        </button>
        <button
          onClick={() => setActiveTab("whiteboard")}
          className={`px-4 py-2 rounded ${
            activeTab === "whiteboard" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          🎨 Whiteboard
        </button>
      </div>
    </div>
    <VideoCall roomId={roomId} />
  </div>
</header>


      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1">
  {isSplitView ? (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-gray-700">
        <CodeEditor
          isLoginModalOpen={isLoginModalOpen}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          username={username}
          roomId={roomId}
        />
      </div>
      <div className="w-1/2">
        <WhiteboardWrapper />
      </div>
    </div>
  ) : activeTab === "editor" ? (
    <CodeEditor
      isLoginModalOpen={isLoginModalOpen}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      username={username}
      roomId={roomId}
    />
  ) : (
    <WhiteboardWrapper />
  )}
</div>

        {roomId && username && (
          <div className="w-[320px] bg-gray-900 border-l border-gray-700 p-3">
            {!isChatOpen ? (
              <>
                <UserList users={users} />

<div className="mt-3 p-3 bg-gray-700 rounded-md">
  <h3 className="text-sm font-medium text-gray-300 mb-2">
    Room Information
  </h3>

  <div className="text-xs text-gray-400 space-y-1">
    <p>
      Room ID: <span className="text-blue-400">{roomId}</span>
    </p>

    <p>
      Users online: <span className="text-green-400">{users.length}</span>
    </p>
  </div>

  <button
    onClick={() => {
      const link = `${window.location.origin}?room=${roomId}`;
      navigator.clipboard.writeText(link);
    }}
    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white py-1 text-xs rounded-md"
  >
    Copy Room Link
  </button>
</div>

<button
  onClick={() => setIsChatOpen(true)}
  className="w-full mt-3 bg-blue-600 rounded py-2"
>
  💬 Open Chatroom
</button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-sm mb-2 text-gray-400"
                >
                  ← Back
                </button>
                <RoomChat
                  messages={chatMessages}
                  onSend={(msg) => sendChatMessage(roomId, msg)}
                />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
