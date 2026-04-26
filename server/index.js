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

const rooms = {}; 
// { roomId: { host: socket.id, users: [{id,name}] } }

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // CREATE ROOM
  socket.on("create-room", ({ name }, cb) => {

    const roomId = Math.random().toString(36).substring(2, 8);

    rooms[roomId] = {
      host: socket.id,
      users: [{ id: socket.id, name }]
    };

    socket.join(roomId);

    cb({ roomId, isHost: true });
  });

  // JOIN ROOM
  socket.on("join-room", ({ roomId, name }, cb) => {

    const room = rooms[roomId];

    if (!room) return cb({ error: "Room not found" });

    if (room.users.length >= 10) {
      return cb({ error: "Room full (max 10 users)" });
    }

    room.users.push({ id: socket.id, name });

    socket.join(roomId);

    cb({ success: true, roomId, isHost: false });

    io.to(roomId).emit("system-message", {
      text: `${name} joined the room`
    });
  });

  // SEND MESSAGE
  socket.on("send-message", ({ roomId, text, name }) => {
    io.to(roomId).emit("receive-message", {
      text,
      name
    });
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("Server running on", PORT);
});
