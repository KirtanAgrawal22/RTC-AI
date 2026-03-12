import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import { executeJavaScript } from './execution/javascript-service';
import { executeCode } from './execution/piston-service'; // now using Judge0
import { executionLimiter } from './middleware/security';

const app = express();
const PORT = process.env.PORT || 3001;

/* ---------------- CORS ---------------- */

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

/* ---------------- EXECUTION API ---------------- */

app.post('/api/execute', executionLimiter, async (req, res) => {
  try {
    const { code, language, stdin = '' } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }

    console.log(`[Execute] ${language} code`);

    let result;

    switch (language) {
      case 'javascript':
        result = executeJavaScript(code, stdin);
        break;

      default:
        result = await executeCode(code, language, stdin); // Judge0
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

/* ---------------- HEALTH ---------------- */

app.get('/api/health', (req, res) => {
  res.json({
    status: "OK",
    judge0: !!process.env.JUDGE0_API_KEY,
    timestamp: new Date().toISOString()
  });
});

/* ---------------- SOCKET SERVER ---------------- */

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

/* ---------------- ROOM STORE ---------------- */

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

/* ---------------- SOCKET LOGIC ---------------- */

io.on("connection", (socket) => {

  console.log(`Client connected: ${socket.id}`);

  /* ---------- CREATE ROOM ---------- */

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
      chat: []
    });

    socket.emit("room-created", { roomId, users: [user] });
    io.to(roomId).emit("users-update", [user]);
  });

  /* ---------- JOIN ROOM ---------- */

  socket.on("joinRoom", ({ username, roomId }) => {

    socket.data.username = username;

    if (!rooms.has(roomId)) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    socket.join(roomId);

    const room = rooms.get(roomId)!;

    const user = {
      id: socket.id,
      username
    };

    const existingIndex = room.users.findIndex(
      u => u.username === username
    );

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
      chat: room.chat
    });

    io.to(roomId).emit("users-update", room.users);

    socket.emit("language-change", {
      language: room.language,
      code: room.code
    });

  });

  /* ---------- CODE CHANGE ---------- */

  socket.on("code-change", ({ code, userId }) => {

    const roomId = Array.from(socket.rooms)[1];

    if (roomId && rooms.has(roomId)) {

      rooms.get(roomId)!.code = code;

      socket.to(roomId).emit("code-change", {
        code,
        userId
      });

    }

  });

  /* ---------- LANGUAGE CHANGE ---------- */

  socket.on("language-change", ({ language, code, userId }) => {

    const roomId = Array.from(socket.rooms)[1];

    if (roomId && rooms.has(roomId)) {

      const room = rooms.get(roomId)!;

      room.language = language;
      room.code = code;

      socket.to(roomId).emit("language-change", {
        language,
        code,
        userId
      });

    }

  });

  /* ---------- CHAT ---------- */

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

      socket.emit(
        "chat-history",
        rooms.get(roomId)!.chat
      );

    }

  });

  /* ---------- VIDEO CALL ---------- */

  socket.on("join-video-room", (roomId: string) => {

    console.log('[VIDEO] join', socket.id);

    if (!roomId || !rooms.has(roomId)) return;

    socket.join(roomId);

    socket.to(roomId).emit(
      "user-joined-video",
      socket.id
    );

  });

  socket.on("send-signal", ({ to, signal, roomId }) => {

    io.to(to).emit("receive-signal", {
      signal,
      from: socket.id
    });

  });

  socket.on("return-signal", ({ to, signal }) => {

    io.to(to).emit("receive-return-signal", {
      signal,
      from: socket.id
    });

  });

  /* ---------- FLOWCHART ---------- */

  socket.on("flowchart-update", ({ elements, mermaidCode, roomId }) => {

    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId)!;

    room.flowchart = { elements, mermaidCode };

    socket.to(roomId).emit("flowchart-update", {
      elements,
      mermaidCode
    });

  });

  socket.on("request-flowchart-state", ({ roomId }) => {

    if (!roomId || !rooms.has(roomId)) return;

    socket.emit(
      "flowchart-state",
      rooms.get(roomId)!.flowchart
    );

  });

  /* ---------- LEAVE ---------- */

  socket.on("leave-room", () => {

    const roomId = Array.from(socket.rooms)[1];
    const username = socket.data.username;

    if (roomId && rooms.has(roomId) && username) {

      const room = rooms.get(roomId)!;

      room.users = room.users.filter(
        u => u.username !== username
      );

      io.to(roomId).emit("user-left", username);

      socket.leave(roomId);

      if (room.users.length === 0)
        rooms.delete(roomId);

    }

  });

  socket.on("disconnect", () => {

    const roomId = Array.from(socket.rooms)[1];
    const username = socket.data.username;

    if (roomId && rooms.has(roomId) && username) {

      const room = rooms.get(roomId)!;

      room.users = room.users.filter(
        u => u.username !== username
      );

      io.to(roomId).emit("user-left", username);

      if (room.users.length === 0)
        rooms.delete(roomId);

    }

  });

});

/* ---------------- ROOT ---------------- */

app.get("/", (req, res) => {
  res.send("RTC AI Backend Running 🚀");
});

/* ---------------- START ---------------- */

server.listen(PORT, () => {

  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🧠 Judge0 API: ${process.env.JUDGE0_API_KEY ? 'Connected' : 'Missing'}`);

});

export default app;