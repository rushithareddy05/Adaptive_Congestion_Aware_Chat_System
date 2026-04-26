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

// ROOMS
const rooms = {};
const users = {};

// HELPERS
const generateRoomId = () =>
  Math.random().toString(36).substring(2, 8);

const getRTT = () => Math.floor(Math.random() * 250) + 50;

const getCongestion = (rtt) => {
  if (rtt < 120) return "LOW";
  if (rtt < 220) return "MEDIUM";
  return "HIGH";
};

io.on("connection", (socket) => {

  console.log("Connected:", socket.id);

  // ROOM LIST
  socket.on("get-rooms", () => {
    socket.emit("room-list", Object.keys(rooms));
  });

  // CREATE ROOM
  socket.on("create-room", ({ name }, cb) => {

    const roomId = generateRoomId();

    rooms[roomId] = {
      host: socket.id,
      hostName: name,
      users: [{ id: socket.id, name }],
      requests: []
    };

    users[socket.id] = { name, roomId };

    socket.join(roomId);

    cb?.({ roomId });

    io.emit("room-list", Object.keys(rooms));

    io.to(roomId).emit("system-message", {
      name: "system",
      text: `${name} created the room 👑`
    });
  });

  // JOIN REQUEST
  socket.on("join-room", ({ roomId, name }, cb) => {

    const room = rooms[roomId];
    if (!room) return cb?.({ error: "Room not found" });

    room.requests.push({ id: socket.id, name });

    users[socket.id] = { name };

    io.to(room.host).emit("join-request", {
      id: socket.id,
      name,
      roomId
    });

    cb?.({ status: "pending" });
  });

  // APPROVE USER
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

      users[userId].roomId = roomId;

      io.to(roomId).emit("system-message", {
        name: "system",
        text: `${user.name} joined 🎉`
      });
    }
  });

  // REJECT USER
  socket.on("reject-user", ({ userId }) => {
    const client = io.sockets.sockets.get(userId);

    if (client) {
      client.emit("system-message", {
        name: "system",
        text: "❌ Your join request was rejected"
      });
    }
  });

  // MESSAGE
  socket.on("send-message", ({ roomId, text, name }) => {

    const room = rooms[roomId];
    if (!room) return;

    if (!room.users.find(u => u.id === socket.id)) return;

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

    const user = users[socket.id];

    if (user?.roomId && rooms[user.roomId]) {
      rooms[user.roomId].users =
        rooms[user.roomId].users.filter(u => u.id !== socket.id);
    }

    delete users[socket.id];

    console.log("Disconnected:", socket.id);
  });

});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
