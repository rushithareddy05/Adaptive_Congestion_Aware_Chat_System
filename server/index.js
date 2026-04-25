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

// users map
let users = {};
let userCount = 1;

// 🔥 NEW: host + control
let hostSocket = null;
let pendingUsers = [];
let approvedUsers = new Set();

io.on("connection", (socket) => {

    // assign default name
    const defaultName = "User" + userCount++;
    users[socket.id] = defaultName;

    console.log(defaultName, "connected");

    socket.emit("your-name", defaultName);

    // 🔥 HOST ASSIGNMENT
    if (!hostSocket) {
        hostSocket = socket.id;
        console.log("Host connected:", defaultName);
        socket.emit("role", "host");
    } else {
        socket.emit("role", "user");
    }

    // 🔥 SET CUSTOM NAME
    socket.on("set-name", (name) => {
        if (name && name.trim()) {
            users[socket.id] = name.trim();
        }
    });

    // 🔥 REQUEST TO JOIN
    socket.on("request-join", () => {
        if (socket.id === hostSocket) return;

        pendingUsers.push(socket.id);

        io.to(hostSocket).emit("join-request", {
            id: socket.id,
            name: users[socket.id]
        });

        socket.emit("waiting");
    });

    // 🔥 APPROVE USER
    socket.on("approve-user", (id) => {
        if (socket.id !== hostSocket) return;

        approvedUsers.add(id);
        pendingUsers = pendingUsers.filter(u => u !== id);

        io.to(id).emit("join-approved");
    });

    // 🔥 REJECT USER
    socket.on("reject-user", (id) => {
        if (socket.id !== hostSocket) return;

        pendingUsers = pendingUsers.filter(u => u !== id);

        io.to(id).emit("join-denied");
    });

    // 🔥 SEND MESSAGE (ONLY APPROVED USERS)
    socket.on("send-message", (data) => {

        if (!data || !data.text) return;

        // ❌ block unapproved users
        if (socket.id !== hostSocket && !approvedUsers.has(socket.id)) {
            return;
        }

        const message = {
            text: data.text,
            name: users[socket.id]
        };

        const delay = Math.random() * 500 + 50;

        setTimeout(() => {

            socket.broadcast.emit("receive-message", message);

            socket.emit("ack", {
                time: Date.now()
            });

        }, delay);
    });

    socket.on("disconnect", () => {
        console.log(users[socket.id], "disconnected");

        // 🔥 if host leaves → reset system
        if (socket.id === hostSocket) {
            console.log("Host left. Resetting room...");
            hostSocket = null;
            pendingUsers = [];
            approvedUsers.clear();
        }

        delete users[socket.id];
    });

});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
