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

const MAX_USERS = 10;

let hostId = null;
let users = {};        // { socketId: { name, role } }
let waiting = {};      // pending users
let roomUsers = [];    // active approved users

// 🔷 SOCKET CONNECTION
io.on("connection", (socket) => {

  console.log("Connected:", socket.id);

  // 👑 FIRST USER = HOST
  if (!hostId) {
    hostId = socket.id;
    users[socket.id] = { name: "HOST", role: "host" };

    socket.emit("host-assigned", true);
  } else {
    waiting[socket.id] = socket;
    socket.emit("waiting-room");

    io.to(hostId).emit("new-request", {
      id: socket.id
    });
  }

  // 🔷 SET NAME
  socket.on("set-name", (name) => {
    if (users[socket.id]) {
      users[socket.id].name = name;
    } else if (waiting[socket.id]) {
      waiting[socket.id].name = name;
    }
  });

  // 🔷 HOST APPROVE USER
  socket.on("approve-user", (userId) => {

    if (socket.id !== hostId) return;
    if (roomUsers.length >= MAX_USERS) return;

    roomUsers.push(userId);

    users[userId] = {
      name: users[userId]?.name || "User",
      role: "member"
    };

    delete waiting[userId];

    io.to(userId).emit("approved");

    io.emit("user-list", roomUsers.map(id => ({
      id,
      name: users[id]?.name || "User"
    })));
  });

  // 🔴 REJECT USER
  socket.on("reject-user", (userId) => {
    if (socket.id !== hostId) return;

    io.to(userId).emit("rejected");
    delete waiting[userId];
  });

  // 🔷 SEND MESSAGE
  socket.on("send-message", (data) => {

    if (!data?.text) return;

    const message = {
      text: data.text,
      name: users[socket.id]?.name || "User"
    };

    roomUsers.forEach(id => {
      io.to(id).emit("receive-message", message);
    });

    io.to(hostId).emit("receive-message", message);
  });

  // 🔷 KICK USER (HOST ONLY)
  socket.on("kick-user", (userId) => {

    if (socket.id !== hostId) return;

    io.to(userId).emit("kicked");

    roomUsers = roomUsers.filter(id => id !== userId);
    delete users[userId];

    io.emit("user-list", roomUsers.map(id => ({
      id,
      name: users[id]?.name || "User"
    })));
  });

  // 🔴 DISCONNECT
  socket.on("disconnect", () => {

    console.log("Disconnected:", socket.id);

    if (socket.id === hostId) {
      hostId = null;
      users = {};
      waiting = {};
      roomUsers = [];
      return;
    }

    roomUsers = roomUsers.filter(id => id !== socket.id);
    delete users[socket.id];
    delete waiting[socket.id];

    io.emit("user-list", roomUsers.map(id => ({
      id,
      name: users[id]?.name || "User"
    })));
  });
});

server.listen(5000, () => {
  console.log("Server running on 5000");
});
