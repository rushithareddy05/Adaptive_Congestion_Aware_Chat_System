import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors({ origin: "*" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// ---------------- STATE ----------------
const rooms = {};
// roomId: {
//   host,
//   hostName,
//   users: [{id,name}],
//   requests: [{id,name}]
// }

// ---------------- HELPERS ----------------
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

  // 🏗 CREATE ROOM (HOST)
  socket.on("create-room", ({ name }, cb) => {

    const roomId = uuidv4().slice(0, 6);

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

  // 🚪 JOIN ROOM REQUEST
  socket.on("join-room", ({ roomId, name }, cb) => {

    const room = rooms[roomId];
    if (!room) return cb?.({ error: "Room not found" });

    if (room.users.length >= 10) {
      return cb?.({ error: "Room full (max 10 users)" });
    }

    // host joins directly (creator already handled anyway)
    if (socket.id === room.host) {
      return cb?.({ roomId });
    }

    // prevent duplicate requests
    const alreadyRequested = room.requests.find(r => r.id === socket.id);
    if (alreadyRequested) {
      return cb?.({ status: "already_requested" });
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

  // 💬 MESSAGE
  socket.on("send-message", ({ roomId, text, name }) => {

    if (!rooms[roomId]) return;

    const rtt = getRTT();
    const congestion = getCongestion(rtt);

    io.to(roomId).emit("receive-message", {
      name,
      text,
      rtt,
      congestion
    });

  });

  // 🔌 DISCONNECT CLEANUP
  socket.on("disconnect", () => {

    console.log("Disconnected:", socket.id);

    for (const roomId in rooms) {

      const room = rooms[roomId];

      room.users = room.users.filter(u => u.id !== socket.id);
      room.requests = room.requests.filter(r => r.id !== socket.id);

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

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
