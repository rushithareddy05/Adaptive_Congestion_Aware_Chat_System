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
const generateRoomId = () =>
  Math.random().toString(36).substring(2, 8);

const getRTT = () => Math.floor(Math.random() * 250) + 50;

const getCongestion = (rtt) => {
  if (rtt < 120) return "LOW";
  if (rtt < 220) return "MEDIUM";
  return "HIGH";
};

// ---------------- SOCKET ----------------
io.on("connection", (socket) => {

  console.log("Connected:", socket.id);

  // 📡 ROOM LIST
  socket.on("get-rooms", () => {
    socket.emit("room-list", Object.keys(rooms));
  });

  // 🏗 CREATE ROOM
  socket.on("create-room", ({ name }, cb) => {

    const roomId = generateRoomId();

    rooms[roomId] = {
      host: socket.id,
      hostName: name,
      users: [{ id: socket.id, name }],
      requests: []
    };

    socket.join(roomId);

    cb?.({ roomId });

    io.emit("room-list", Object.keys(rooms));

    io.to(roomId).emit("system-message", {
      name: "system",
      text: `${name} created the room`
    });
  });

  // 🚪 JOIN ROOM
  socket.on("join-room", ({ roomId, name }, cb) => {

    const room = rooms[roomId];
    if (!room) return cb?.({ error: "Room not found" });

    if (room.users.length >= 10) {
      return cb?.({ error: "Room full (max 10 users)" });
    }

    // prevent duplicate requests
    const already = room.requests.find(r => r.id === socket.id);
    if (already) return cb?.({ status: "already_requested" });

    // host auto join
    if (socket.id === room.host) {
      socket.join(roomId);
      return cb?.({ roomId });
    }

    room.requests.push({ id: socket.id, name });

    io.to(room.host).emit("join-request", {
      id: socket.id,
      name,
      roomId
    });

    cb?.({ status: "pending" });
  });

  // ✅ APPROVE USER
  socket.on("approve-user", ({ roomId, userId }) => {

    const room = rooms[roomId];
    if (!room) return;

    const user = room.requests.find(u => u.id === userId);
    if (!user) return;

    room.requests = room.requests.filter(u => u.id !== userId);
    room.users.push(user);

    const client = io.sockets.sockets.get(userId);

    if (client) {
      client.join(roomId);

      client.emit("join-approved", { roomId });

      io.to(roomId).emit("system-message", {
        name: "system",
        text: `${user.name} joined the room`
      });
    }
  });

  // ❌ REJECT USER
  socket.on("reject-user", ({ userId }) => {
    io.to(userId).emit("join-rejected", "Access denied by host");
  });

  // 💬 MESSAGE
  socket.on("send-message", ({ roomId, text, name }) => {

    const room = rooms[roomId];
    if (!room) return;

    const rtt = getRTT();
    const congestion = getCongestion(rtt);

    io.to(roomId).emit("receive-message", {
      name,
      text,
      rtt,
      congestion
    });
  });

  // 👋 DISCONNECT
  socket.on("disconnect", () => {

    console.log("Disconnected:", socket.id);

    for (const roomId in rooms) {

      const room = rooms[roomId];

      const wasUser = room.users.find(u => u.id === socket.id);
      const wasRequest = room.requests.find(r => r.id === socket.id);

      room.users = room.users.filter(u => u.id !== socket.id);
      room.requests = room.requests.filter(r => r.id !== socket.id);

      if (wasUser && socket.id !== room.host) {
        io.to(roomId).emit("system-message", {
          name: "system",
          text: `${wasUser.name} left the room`
        });
      }

      // HOST LEFT → DELETE ROOM
      if (room.host === socket.id) {

        io.to(roomId).emit("system-message", {
          name: "system",
          text: "Host disconnected. Room closed."
        });

        io.in(roomId).socketsLeave(roomId);

        delete rooms[roomId];
        io.emit("room-list", Object.keys(rooms));
      }

      // CLEAN EMPTY ROOMS
      if (room.users.length === 0) {
        delete rooms[roomId];
        io.emit("room-list", Object.keys(rooms));
      }
    }
  });

});

// ---------------- START ----------------
server.listen(5000, () => {
  console.log("Server running on port 5000");
});
