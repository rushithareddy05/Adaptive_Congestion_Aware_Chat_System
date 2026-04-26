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

  // 📡 SEND ROOM LIST
  socket.on("get-rooms", () => {
    socket.emit("room-list", Object.keys(rooms));
  });

  // 🏗 CREATE ROOM (HOST)
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
    const alreadyRequested = room.requests.find(r => r.id === socket.id);
    if (alreadyRequested) {
      return cb?.({ status: "already_requested" });
    }

    // host joins directly
    if (socket.id === room.host) {
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

    const clientSocket = io.sockets.sockets.get(userId);

    if (clientSocket) {
      clientSocket.join(roomId);

      clientSocket.emit("join-approved", { roomId });

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

  // 💬 SEND MESSAGE
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

  // 🔌 DISCONNECT HANDLING
  socket.on("disconnect", () => {

    console.log("Disconnected:", socket.id);

    for (const roomId in rooms) {

      const room = rooms[roomId];

      room.users = room.users.filter(u => u.id !== socket.id);
      room.requests = room.requests.filter(r => r.id !== socket.id);

      // if host leaves → delete room
      if (room.host === socket.id) {

        io.to(roomId).emit("system-message", {
          name: "system",
          text: "Host disconnected. Room closed."
        });

        delete rooms[roomId];
        io.emit("room-list", Object.keys(rooms));
      }
    }
  });

});

// ---------------- START SERVER ----------------
server.listen(5000, () => {
  console.log("Server running on port 5000");
});
