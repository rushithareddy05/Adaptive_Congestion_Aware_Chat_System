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

// STORE ROOMS
const rooms = {}; 
/*
roomId: {
  hostId,
  users: [{id, name}],
}
*/

io.on("connection", (socket) => {

  console.log("Connected:", socket.id);

  // 📌 CREATE ROOM (USER BECOMES HOST OF THIS ROOM)
  socket.on("create-room", ({ name }, cb) => {

    const roomId = Math.random().toString(36).substring(2, 7);

    rooms[roomId] = {
      hostId: socket.id,
      users: [{ id: socket.id, name }]
    };

    socket.join(roomId);

    cb({
      roomId,
      isHost: true
    });

    io.emit("room-list", Object.keys(rooms));

  });

  // 📌 GET ALL ROOMS
  socket.on("get-rooms", () => {
    socket.emit("room-list", Object.keys(rooms));
  });

  // 📌 JOIN ROOM
  socket.on("join-room", ({ roomId, name }, cb) => {

    const room = rooms[roomId];

    if (!room) return cb({ error: "Room not found" });

    if (room.users.length >= 10) {
      return cb({ error: "Room full (max 10 users)" });
    }

    room.users.push({ id: socket.id, name });

    socket.join(roomId);

    cb({
      roomId,
      isHost: room.hostId === socket.id
    });

    io.to(roomId).emit("system-message", {
      name: "system",
      text: `${name} joined room`
    });

  });

  // 📌 MESSAGE
  socket.on("send-message", ({ roomId, text, name }) => {

    const rtt = Math.floor(Math.random() * 300) + 50;

    const congestion =
      rtt < 150 ? "LOW" :
      rtt < 300 ? "MEDIUM" : "HIGH";

    io.to(roomId).emit("receive-message", {
      name,
      text,
      rtt,
      congestion
    });

  });

  // 📌 DISCONNECT CLEANUP
  socket.on("disconnect", () => {

    for (const roomId in rooms) {
      rooms[roomId].users =
        rooms[roomId].users.filter(u => u.id !== socket.id);
    }

    console.log("Disconnected:", socket.id);

  });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("Server running on", PORT);
});
