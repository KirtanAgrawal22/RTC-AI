"use client";

import { useState } from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

type ChatMessage = {
  user: string;
  message: string;
  timestamp: string;
};

export default function RoomChat({
  messages = [],
  onSend,
}: {
  messages?: ChatMessage[];
  onSend: (msg: string) => void;
}) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className="max-w-[80%] px-3 py-2 rounded-lg text-sm bg-gray-700 text-white"
          >
            <div className="text-xs text-gray-300 mb-1">{m.user}</div>
            <div>{m.message}</div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-gray-700 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 bg-gray-800 rounded px-3 py-2 text-sm text-white outline-none"
          placeholder="Type a message"
        />
        <button
          className="bg-blue-600 px-4 rounded text-white"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}
