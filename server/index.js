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

// ---------------- DATA ----------------
const rooms = {};
const users = {};

// ---------------- HELPERS ----------------
const generateRoomId = () =>
  Math.random().toString(36).substring(2, 8);

const getRTT = () => Math.floor(Math.random() * 300) + 50;

const getCongestion = (rtt) => {
  if (rtt < 120) return "LOW";
  if (rtt < 220) return "MEDIUM";
  return "HIGH";
};

// ✅ ALWAYS RETURN ACTIVE ROOMS ONLY
const getActiveRooms = () =>
  Object.entries(rooms)
    .filter(([_, room]) => room.users.length > 0)
    .map(([id]) => id);

// ✅ SAFE EMIT
const broadcastRooms = () => {
  io.emit("room-list", getActiveRooms());
};

// ---------------- SOCKET ----------------
io.on("connection", (socket) => {

  console.log("Connected:", socket.id);

  // ---------------- GET ROOMS ----------------
  socket.on("get-rooms", () => {
    socket.emit("room-list", getActiveRooms());
  });

  // ---------------- CREATE ROOM ----------------
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

    broadcastRooms();

    io.to(roomId).emit("system-message", {
      name: "system",
      text: `${name} created the room 👑`
    });
  });

  // ---------------- JOIN ROOM ----------------
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

  // ---------------- APPROVE USER ----------------
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

      users[userId] = {
        name: user.name,
        roomId
      };

      client.emit("approved", {
        roomId,
        name: user.name
      });

      io.to(roomId).emit("system-message", {
        name: "system",
        text: `${user.name} joined 🎉`
      });
    }

    broadcastRooms();
  });

  // ---------------- REJECT USER ----------------
  socket.on("reject-user", ({ userId }) => {

    const room = Object.values(rooms).find(r =>
      r.requests.some(u => u.id === userId)
    );

    if (room) {
      room.requests = room.requests.filter(u => u.id !== userId);
    }

    const client = io.sockets.sockets.get(userId);

    if (client) {
      client.emit("rejected", {
        message: "Host rejected your request"
      });
    }
  });

  // ---------------- SEND MESSAGE ----------------
  socket.on("send-message", ({ roomId, text, name }) => {

    const room = rooms[roomId];
    if (!room) return;

    const isMember = room.users.find(u => u.id === socket.id);
    if (!isMember) return;

    const rtt = getRTT();
    const congestion = getCongestion(rtt);

    io.to(roomId).emit("receive-message", {
      name,
      text,
      rtt,
      congestion
    });
  });

  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", () => {

    const user = users[socket.id];
    if (!user) return;

    const { roomId } = user;
    const room = rooms[roomId];

    if (room) {

      // ✅ IF HOST LEAVES → DELETE ROOM
      if (room.host === socket.id) {

        // notify users before deletion
        io.to(roomId).emit("system-message", {
          name: "system",
          text: "Host left. Room closed ❌"
        });

        delete rooms[roomId];
        broadcastRooms();

      } else {

        // remove user normally
        room.users = room.users.filter(u => u.id !== socket.id);

        io.to(roomId).emit("system-message", {
          name: "system",
          text: `${user.name} left`
        });

        // delete if empty
        if (room.users.length === 0) {
          delete rooms[roomId];
        }

        broadcastRooms();
      }
    }

    delete users[socket.id];

    console.log("Disconnected:", socket.id);
  });

});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
