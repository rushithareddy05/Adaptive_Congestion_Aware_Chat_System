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

let hostId = null;
let users = {};
let pending = {};
let roomUsers = [];

const MAX_USERS = 10;

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    // 🔷 FIRST USER = HOST
    if (!hostId) {
        hostId = socket.id;
        users[socket.id] = { name: "HOST", role: "host" };

        socket.emit("host-assigned", true);
        console.log("Host set:", socket.id);
    } else {
        pending[socket.id] = socket;
        socket.emit("waiting-room");

        // notify host
        io.to(hostId).emit("new-request", {
            id: socket.id
        });
    }

    // 🔷 HOST APPROVES USER
    socket.on("approve-user", (userId) => {

        if (socket.id !== hostId) return;

        if (roomUsers.length >= MAX_USERS) {
            io.to(userId).emit("rejected", "Room full");
            return;
        }

        roomUsers.push(userId);

        users[userId] = {
            name: "User" + roomUsers.length,
            role: "member"
        };

        io.to(userId).emit("approved");

        delete pending[userId];

        console.log("Approved:", userId);
    });

    // 🔷 CHAT MESSAGE
    socket.on("send-message", (data) => {

        if (!data || !data.text) return;

        const message = {
            text: data.text,
            name: users[socket.id]?.name || "User"
        };

        // broadcast to all approved users
        roomUsers.forEach(id => {
            io.to(id).emit("receive-message", message);
        });

        // also host receives messages
        io.to(hostId).emit("receive-message", message);
    });

    // 🔴 DISCONNECT
    socket.on("disconnect", () => {

        console.log("Disconnected:", socket.id);

        if (socket.id === hostId) {
            hostId = null;
            users = {};
            roomUsers = [];
            pending = {};
        } else {
            roomUsers = roomUsers.filter(id => id !== socket.id);
            delete users[socket.id];
            delete pending[socket.id];
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log("Server running on", PORT);
});
