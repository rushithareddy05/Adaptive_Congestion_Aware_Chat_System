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

// ---------------- STATE ----------------
let hostId = null;
let users = {};        // socketId -> name
let pending = {};      // socketId -> name
let approved = new Set();

// ---------------- SOCKET ----------------
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // 👑 FIRST USER = HOST
  if (!hostId) {
    hostId = socket.id;
    socket.emit("you-are-host");
    console.log("HOST:", socket.id);
  }

  // ---------------- JOIN REQUEST ----------------
  socket.on("request-join", (name) => {
    if (Object.keys(approved).length >= 10) {
      socket.emit("join-rejected", "Room Full");
      return;
    }

    pending[socket.id] = name;

    // send request to host
    io.to(hostId).emit("join-request", {
      id: socket.id,
      name
    });
  });

  // ---------------- HOST APPROVE ----------------
  socket.on("approve-user", (userId) => {
    if (socket.id !== hostId) return;

    approved.add(userId);

    users[userId] = pending[userId];
    delete pending[userId];

    io.to(userId).emit("join-approved", users[userId]);
  });

  // ---------------- HOST REJECT ----------------
  socket.on("reject-user", (userId) => {
    if (socket.id !== hostId) return;

    delete pending[userId];

    io.to(userId).emit("join-rejected", "Rejected by host");
  });

  // ---------------- SET NAME ----------------
  socket.on("set-name", (name) => {
    users[socket.id] = name;
  });

  // ---------------- CHAT ----------------
  socket.on("send-message", (data) => {
    if (!approved.has(socket.id) && socket.id !== hostId) return;

    const msg = {
      text: data.text,
      name: users[socket.id] || "User"
    };

    socket.broadcast.emit("receive-message", msg);
  });

  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", () => {
    delete users[socket.id];
    delete pending[socket.id];
    approved.delete(socket.id);

    if (socket.id === hostId) {
      hostId = null; // new host next time
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on", PORT));
