const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const ROOM = "GLOBAL_CHAT";

let hostId = null;
let users = {};          // socketId -> name
let pending = {};        // waiting users
let approved = new Set(); // allowed users

const MAX_USERS = 10;

// ---------------- CONNECTION ----------------
io.on("connection", (socket) => {

  console.log("🔌 Connected:", socket.id);

  // 👑 FIRST USER = HOST
  if (!hostId) {
    hostId = socket.id;
    approved.add(socket.id);
    users[socket.id] = "Host";

    socket.join(ROOM);

    console.log("👑 HOST ASSIGNED:", socket.id);

    socket.emit("you-are-host");
  }

  // ---------------- JOIN REQUEST ----------------
  socket.on("request-join", (name) => {

    console.log("📩 Join request:", name);

    if (approved.size >= MAX_USERS) {
      socket.emit("join-rejected", "Room Full (10 users max)");
      return;
    }

    pending[socket.id] = name;

    // send request ONLY to host
    if (hostId) {
      io.to(hostId).emit("join-request", {
        id: socket.id,
        name
      });
    }
  });

  // ---------------- APPROVE USER ----------------
  socket.on("approve-user", (userId) => {

    if (socket.id !== hostId) return;

    if (!pending[userId]) return;

    approved.add(userId);
    users[userId] = pending[userId];

    delete pending[userId];

    const userSocket = io.sockets.sockets.get(userId);

    if (userSocket) {
      userSocket.join(ROOM);
      userSocket.emit("join-approved");
    }

    console.log("✅ Approved:", userId);
  });

  // ---------------- REJECT USER ----------------
  socket.on("reject-user", (userId) => {

    if (socket.id !== hostId) return;

    delete pending[userId];

    io.to(userId).emit("join-rejected", "Rejected by host");

    console.log("❌ Rejected:", userId);
  });

  // ---------------- CHAT ----------------
  socket.on("send-message", (data) => {

    if (!approved.has(socket.id)) {
      console.log("⛔ Blocked message from unapproved user");
      return;
    }

    const msg = {
      text: data.text,
      name: users[socket.id] || "User"
    };

    io.to(ROOM).emit("receive-message", msg);
  });

  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", () => {

    console.log("❌ Disconnected:", socket.id);

    if (socket.id === hostId) {
      hostId = null;
      console.log("👑 Host left, resetting host");
    }

    delete users[socket.id];
    delete pending[socket.id];
    approved.delete(socket.id);
  });

});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
