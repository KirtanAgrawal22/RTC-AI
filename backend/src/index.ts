import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { executeJavaScript } from './execution/javascript-service';
import { executeCode } from './execution/piston-service'; 
import { executionLimiter } from './middleware/security';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------- CORS ----------------
const allowedOrigins = [
  "http://localhost:3000",
  "https://*.vercel.app",
  "https://*.now.sh"
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          const domainPattern = allowedOrigin.replace('*.', '');
          return origin.endsWith(domainPattern);
        }
        return origin === allowedOrigin;
      }) ||
      origin.includes('localhost')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ---------------- HTTP APIs ----------------
app.post('/api/execute', executionLimiter, async (req, res) => {
  try {
    const { code, language, stdin = '' } = req.body;
    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    let result;
    switch (language) {
      case 'javascript':
        result = executeJavaScript(code, stdin);
        break;
      default:
        result = await executeCode(code, language, stdin);
    }

    res.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      error: 'Execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ---------------- SOCKET SETUP ----------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin.includes('*')) {
            const domainPattern = allowedOrigin.replace('*.', '');
            return origin.endsWith(domainPattern);
          }
          return origin === allowedOrigin;
        }) ||
        origin.includes('localhost')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// ---------------- ROOM STORE (UPDATED) ----------------
const rooms = new Map<
  string,
  {
    users: any[];
    code: string;
    language: string;
    whiteboard: any;
    flowchart: any;
    chat: { user: string; message: string; timestamp: string }[];
  }
>();

// ---------------- SOCKET LOGIC ----------------
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("createRoom", ({ username, roomId }) => {
    socket.data.username = username;
    socket.join(roomId);

    const user = { id: socket.id, username };

    rooms.set(roomId, {
      users: [user],
      code: '',
      language: 'python',
      whiteboard: {},
      flowchart: { elements: [], mermaidCode: '' },
      chat: [] // ✅ CHAT INIT
    });

    socket.emit("room-created", { roomId, users: [user] });
    io.to(roomId).emit("users-update", [user]);
  });

  socket.on("joinRoom", ({ username, roomId }) => {
    socket.data.username = username;

    if (!rooms.has(roomId)) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    socket.join(roomId);
    const room = rooms.get(roomId)!;
    const user = { id: socket.id, username };

    const existingIndex = room.users.findIndex(u => u.username === username);
    if (existingIndex === -1) {
      room.users.push(user);
    } else {
      room.users[existingIndex].id = socket.id;
    }

    socket.emit("room-joined", {
      roomId,
      users: room.users,
      code: room.code,
      language: room.language,
      whiteboard: room.whiteboard || {},
      flowchart: room.flowchart || { elements: [], mermaidCode: '' },
      chat: room.chat // ✅ SEND CHAT HISTORY
    });

    io.to(roomId).emit("users-update", room.users);
    socket.emit("language-change", { language: room.language, code: room.code });
  });

  socket.on("code-change", ({ code, userId }) => {
    const roomId = Array.from(socket.rooms)[1];
    if (roomId && rooms.has(roomId)) {
      rooms.get(roomId)!.code = code;
      socket.to(roomId).emit("code-change", { code, userId });
    }
  });

  socket.on("language-change", ({ language, code, userId }) => {
    const roomId = Array.from(socket.rooms)[1];
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      room.language = language;
      room.code = code;
      socket.to(roomId).emit("language-change", { language, code, userId });
    }
  });

  // ---------------- CHAT EVENTS (NEW) ----------------
  socket.on("chat-message", ({ roomId, message }) => {
    if (!roomId || !rooms.has(roomId)) return;

    const chatMessage = {
      user: socket.data.username || "Anonymous",
      message,
      timestamp: new Date().toISOString()
    };

    rooms.get(roomId)!.chat.push(chatMessage);
    io.to(roomId).emit("chat-message", chatMessage);
  });

  socket.on("request-chat-history", ({ roomId }) => {
    if (roomId && rooms.has(roomId)) {
      socket.emit("chat-history", rooms.get(roomId)!.chat);
    }
  });

  // ---------------- VIDEO CALL SIGNALING (with logs) ----------------
  socket.on("join-video-room", (roomId: string) => {
    console.log('[BACKEND VIDEO] join-video-room from:', socket.id, 'room:', roomId);
    if (!roomId || !rooms.has(roomId)) return;
    socket.join(roomId);
    socket.to(roomId).emit("user-joined-video", socket.id);
  });

  socket.on("send-signal", ({ to, signal, roomId }: { to: string; signal: any; roomId: string }) => {
    console.log('[BACKEND VIDEO] send-signal from:', socket.id, 'to:', to, 'room:', roomId);
    if (!roomId || !rooms.has(roomId)) return;
    io.to(to).emit("receive-signal", { signal, from: socket.id });
  });

  socket.on("return-signal", ({ to, signal }: { to: string; signal: any }) => {
    console.log('[BACKEND VIDEO] return-signal from:', socket.id, 'to:', to);
    io.to(to).emit("receive-return-signal", { signal, from: socket.id });
  });

  socket.on("leave-room", () => {
    const roomId = Array.from(socket.rooms)[1];
    const username = socket.data.username;
    if (roomId && rooms.has(roomId) && username) {
      const room = rooms.get(roomId)!;
      room.users = room.users.filter(u => u.username !== username);
      io.to(roomId).emit("user-left", username);
      socket.leave(roomId);
      if (room.users.length === 0) rooms.delete(roomId);
    }
  });

  socket.on("disconnect", () => {
    const roomId = Array.from(socket.rooms)[1];
    const username = socket.data.username;
    if (roomId && rooms.has(roomId) && username) {
      const room = rooms.get(roomId)!;
      room.users = room.users.filter(u => u.username !== username);
      io.to(roomId).emit("user-left", username);
      if (room.users.length === 0) rooms.delete(roomId);
    }
  });
  // ---------------- FLOWCHART EVENTS (ADD ONLY) ----------------

// Receive flowchart updates and broadcast to room
socket.on("flowchart-update", ({ elements, mermaidCode, roomId }) => {
  if (!roomId || !rooms.has(roomId)) return;

  const room = rooms.get(roomId)!;
  room.flowchart = { elements, mermaidCode };

  // Broadcast updated flowchart to everyone in the room
  socket.to(roomId).emit("flowchart-update", {
    elements,
    mermaidCode
  });
});

// Send current flowchart state when requested
socket.on("request-flowchart-state", ({ roomId }) => {
  if (!roomId || !rooms.has(roomId)) return;

  const room = rooms.get(roomId)!;
  socket.emit("flowchart-state", room.flowchart);
});
});



// ---------------- SERVER START ----------------
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

export default app;
