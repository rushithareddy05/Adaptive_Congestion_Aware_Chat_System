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
let users = {};
let pending = {};
let approvedCount = 0;
const MAX_USERS = 10;

// ---------------- CONNECTION ----------------
io.on("connection", (socket) => {

  console.log("connected:", socket.id);

  // 👑 FIRST USER = HOST
  if (!hostId) {
    hostId = socket.id;
    socket.emit("you-are-host");
  }

  // ---------------- JOIN REQUEST ----------------
  socket.on("request-join", (name) => {

    if (approvedCount >= MAX_USERS) {
      socket.emit("join-rejected", "Room Full (10 users max)");
      return;
    }

    pending[socket.id] = name;

    io.to(hostId).emit("join-request", {
      id: socket.id,
      name
    });
  });

  // ---------------- APPROVE ----------------
  socket.on("approve-user", (userId) => {
    if (socket.id !== hostId) return;

    if (approvedCount >= MAX_USERS) return;

    approvedCount++;

    users[userId] = pending[userId];
    delete pending[userId];

    socket.to(userId).emit("join-approved");

    // IMPORTANT: force join SAME ROOM
    io.sockets.sockets.get(userId)?.join(ROOM);
  });

  // ---------------- REJECT ----------------
  socket.on("reject-user", (userId) => {
    if (socket.id !== hostId) return;

    delete pending[userId];

    io.to(userId).emit("join-rejected", "Rejected by host");
  });

  // ---------------- MESSAGE ----------------
  socket.on("send-message", (data) => {

    if (!users[socket.id] && socket.id !== hostId) return;

    const msg = {
      text: data.text,
      name: users[socket.id] || "Host"
    };

    io.to(ROOM).emit("receive-message", msg);
  });

  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", () => {

    delete users[socket.id];
    delete pending[socket.id];

    if (socket.id === hostId) {
      hostId = null;
      approvedCount = 0;
    }
  });

});

server.listen(5000, () => {
  console.log("Server running on 5000");
});
