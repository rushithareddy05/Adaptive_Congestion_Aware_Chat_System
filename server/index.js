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
const messageCooldowns = {};

// ---------------- HELPERS ----------------
const generateRoomId = () =>
  Math.random().toString(36).substring(2, 8);

const getRTT = () => Math.floor(Math.random() * 300) + 50;

const getCongestion = (rtt) => {
  if (rtt < 120) return "LOW";
  if (rtt < 220) return "MEDIUM";
  return "HIGH";
};

const getActiveRooms = () =>
  Object.entries(rooms)
    .filter(([_, room]) => room.users.length > 0)
    .map(([id]) => id);

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
      requests: [],
      banned: [] // ✅ NEW
    };

    users[socket.id] = { name, roomId };

    socket.join(roomId);

    cb?.({ roomId });

    broadcastRooms();

    io.to(roomId).emit("system-message", {
      name: "system",
      text: `${name} created the Room 👑`
    });

    // ✅ send active users
    io.to(roomId).emit("room-users", rooms[roomId].users);
  });

  // ---------------- JOIN ROOM ----------------
  socket.on("join-room", ({ roomId, name }, cb) => {

    const room = rooms[roomId];
    if (!room) return cb?.({ error: "Room not found" });

    // ✅ BLOCK BANNED USERS
    if (room.banned.includes(socket.id)) {
      return cb?.({ error: "You are banned from this room" });
    }

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

    // ✅ update users
    io.to(roomId).emit("room-users", room.users);
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
        message: "Host Rejected Your Request."
      });
    }
  });

  // ---------------- KICK USER ----------------
  socket.on("kick-user", ({ roomId, userId }) => {

    const room = rooms[roomId];
    if (!room) return;

    if (room.host !== socket.id) return;

    room.users = room.users.filter(u => u.id !== userId);

    const client = io.sockets.sockets.get(userId);

    if (client) {
      client.leave(roomId);
      client.emit("kicked", {
        message: "👢 You were removed by host"
      });
    }

    io.to(roomId).emit("system-message", {
      name: "system",
      text: "A user was kicked 👢"
    });

    io.to(roomId).emit("room-users", room.users);
  });

  // ---------------- BAN USER ----------------
  socket.on("ban-user", ({ roomId, userId }) => {

    const room = rooms[roomId];
    if (!room) return;

    if (room.host !== socket.id) return;

    // remove from active users
    room.users = room.users.filter(u => u.id !== userId);

    // remove from requests
    room.requests = room.requests.filter(u => u.id !== userId);

    // add to banned list
    if (!room.banned.includes(userId)) {
      room.banned.push(userId);
    }

    const client = io.sockets.sockets.get(userId);

    if (client) {
      client.leave(roomId);
      client.emit("banned", {
        message: "🚫 You are banned from this room"
      });
    }

    io.to(roomId).emit("system-message", {
      name: "system",
      text: "A user was banned 🚫"
    });

    io.to(roomId).emit("room-users", room.users);
  });

  // ---------------- SEND MESSAGE ----------------
  socket.on("send-message", ({ roomId, text, name }) => {

    const room = rooms[roomId];
    if (!room) return;

    const isMember = room.users.find(u => u.id === socket.id);
    if (!isMember) return;

    const rtt = getRTT();
    const congestion = getCongestion(rtt);

    const now = Date.now();
    const cooldown = messageCooldowns[socket.id] || 0;

    if (now < cooldown) {
      return socket.emit("slow-mode", {
        message: "⚠ Slow mode active! Please wait..."
      });
    }

    let delay = 0;
    if (congestion === "MEDIUM") delay = 1000;
    if (congestion === "HIGH") delay = 3000;

    if (congestion === "HIGH") {
      socket.emit("slow-mode", {
        message: "🚨 High congestion detected! Slow mode ON"
      });
    }

    messageCooldowns[socket.id] = now + delay;

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

      if (room.host === socket.id) {

        io.to(roomId).emit("system-message", {
          name: "system",
          text: "Host left. Room closed ❌"
        });

        delete rooms[roomId];
        broadcastRooms();

      } else {

        room.users = room.users.filter(u => u.id !== socket.id);

        io.to(roomId).emit("system-message", {
          name: "system",
          text: `${user.name} left`
        });

        io.to(roomId).emit("room-users", room.users);

        if (room.users.length === 0) {
          delete rooms[roomId];
        }

        broadcastRooms();
      }
    }

    delete users[socket.id];
    delete messageCooldowns[socket.id];

    console.log("Disconnected:", socket.id);
  });

});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
