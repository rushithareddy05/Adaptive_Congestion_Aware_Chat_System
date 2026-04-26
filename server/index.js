import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

app.use(cors({ origin: "*" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// ---------------- ROOMS ----------------
const rooms = {};

// ---------------- HELPERS ----------------
const genRoomId = () =>
  Math.random().toString(36).substring(2, 8);

const getRTT = () => Math.floor(Math.random() * 220) + 40;

const getCongestion = (rtt) => {
  if (rtt < 120) return "LOW";
  if (rtt < 200) return "MEDIUM";
  return "HIGH";
};

// ---------------- SOCKET ----------------
io.on("connection", (socket) => {

  console.log("Connected:", socket.id);

  // CREATE ROOM (HOST)
  socket.on("create-room", ({ name }, cb) => {

    const roomId = genRoomId();

    rooms[roomId] = {
      host: socket.id,
      hostName: name,
      users: [{ id: socket.id, name }]
    };

    socket.join(roomId);

    cb?.({ roomId });

    io.emit("room-list", Object.keys(rooms));

    io.to(roomId).emit("system-message", {
      name: "system",
      text: `${name} created the room 👑`
    });
  });

  // GET ROOMS
  socket.on("get-rooms", () => {
    socket.emit("room-list", Object.keys(rooms));
  });

  // JOIN ROOM
  socket.on("join-room", ({ roomId, name }, cb) => {

    const room = rooms[roomId];

    if (!room) return cb?.({ error: "Room not found" });

    if (room.users.length >= 10)
      return cb?.({ error: "Room full (max 10 users)" });

    room.users.push({ id: socket.id, name });

    socket.join(roomId);

    cb?.({ roomId });

    io.to(roomId).emit("system-message", {
      name: "system",
      text: `${name} joined`
    });
  });

  // MESSAGE
  socket.on("send-message", ({ roomId, text, name }) => {

    const rtt = getRTT();
    const congestion = getCongestion(rtt);

    io.to(roomId).emit("receive-message", {
      name,
      text,
      rtt,
      congestion
    });
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });

});

server.listen(5000, () => {
  console.log("Server running on 5000");
});
