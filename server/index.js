import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

const app = express();

app.use(cors({
  origin: "*"
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// ---------------- DATA STORAGE ----------------
const rooms = {}; 
// roomId: { host, users: [], requests: [] }

// ---------------- SOCKET ----------------
io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // CREATE ROOM
  socket.on("create-room", ({ name }, cb) => {

    const roomId = uuidv4().slice(0, 6);

    rooms[roomId] = {
      host: socket.id,
      hostName: name,
      users: [{ id: socket.id, name }],
      requests: []
    };

    socket.join(roomId);

    cb({ roomId });

    io.emit("room-list", Object.keys(rooms));
  });

  // GET ROOMS
  socket.on("get-rooms", () => {
    socket.emit("room-list", Object.keys(rooms));
  });

  // JOIN REQUEST
  socket.on("join-room", ({ roomId, name }, cb) => {

    const room = rooms[roomId];
    if (!room) return cb({ error: "Room not found" });

    if (room.users.length >= 10) {
      return cb({ error: "Room full (max 10 users)" });
    }

    if (room.host === socket.id) {
      room.users.push({ id: socket.id, name });
      socket.join(roomId);
      return cb({ roomId });
    }

    // send request to host
    room.requests.push({ id: socket.id, name });

    io.to(room.host).emit("join-request", {
      id: socket.id,
      name
    });

    cb({ status: "pending" });

  });

  // HOST APPROVE
  socket.on("approve-user", ({ roomId, userId }) => {

    const room = rooms[roomId];
    if (!room) return;

    const user = room.requests.find(u => u.id === userId);
    if (!user) return;

    room.requests = room.requests.filter(u => u.id !== userId);

    room.users.push(user);

    io.to(userId).emit("join-approved", { roomId });

    io.sockets.sockets.get(userId)?.join(roomId);

    io.to(roomId).emit("system-message", {
      name: "system",
      text: `${user.name} joined the room`
    });

  });

  // HOST REJECT
  socket.on("reject-user", ({ userId }) => {
    io.to(userId).emit("join-rejected", "Access denied by host");
  });

  // MESSAGE
  socket.on("send-message", ({ roomId, text, name }) => {

    const rtt = Math.floor(Math.random() * 200) + 50;

    let congestion = "LOW";
    if (rtt > 150) congestion = "MEDIUM";
    if (rtt > 250) congestion = "HIGH";

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
  console.log("Server running on port 5000");
});
