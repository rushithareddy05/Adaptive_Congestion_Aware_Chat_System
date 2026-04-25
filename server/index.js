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

let hostId = null;              // 👑 ONLY ONE HOST
let users = {};                // socketId -> name
let pending = {};              // waiting users
let approved = new Set();

const MAX_USERS = 10;

// ---------------- CONNECTION ----------------
io.on("connection", (socket) => {

  console.log("connected:", socket.id);

  // 👑 FIRST USER = HOST
  if (!hostId) {
    hostId = socket.id;
    socket.emit("you-are-host");
    socket.join(ROOM);
    approved.add(socket.id);
    users[socket.id] = "Host";
  }

  // ---------------- JOIN REQUEST ----------------
  socket.on("request-join", (name) => {

    if (approved.size >= MAX_USERS) {
      socket.emit("join-rejected", "Room Full (10 users max)");
      return;
    }

    pending[socket.id] = name;

    // send request ONLY TO HOST
    if (hostId) {
      io.to(hostId).emit("join-request", {
        id: socket.id,
        name
      });
    }
  });

  // ---------------- APPROVE USER (ONLY HOST) ----------------
  socket.on("approve-user", (userId) => {

    if (socket.id !== hostId) return;

    approved.add(userId);
    users[userId] = pending[userId] || "User";

    delete pending[userId];

    io.to(userId).emit("join-approved");

    io.sockets.sockets.get(userId)?.join(ROOM);
  });

  // ---------------- REJECT USER (ONLY HOST) ----------------
  socket.on("reject-user", (userId) => {

    if (socket.id !== hostId) return;

    delete pending[userId];

    io.to(userId).emit("join-rejected", "Rejected by host");
  });

  // ---------------- CHAT ----------------
  socket.on("send-message", (data) => {

    if (!approved.has(socket.id)) return;

    const msg = {
      text: data.text,
      name: users[socket.id] || "User"
    };

    io.to(ROOM).emit("receive-message", msg);
  });

  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", () => {

    if (socket.id === hostId) {
      hostId = null; // reset host if leaves
    }

    delete users[socket.id];
    delete pending[socket.id];
    approved.delete(socket.id);

    console.log("disconnected:", socket.id);
  });

});

server.listen(5000, () => {
  console.log("Server running on 5000");
});
