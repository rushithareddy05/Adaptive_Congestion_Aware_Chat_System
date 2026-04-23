const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// users map
let users = {};
let userCount = 1;

io.on("connection", (socket) => {

    // ✅ assign username
    const username = "User" + userCount++;
    users[socket.id] = username;

    console.log(username, "connected");

    // send username to client
    socket.emit("your-name", username);

    // 📤 RECEIVE MESSAGE FROM CLIENT
    socket.on("send-message", (data) => {

        // ❗ VALIDATION (prevents empty bubbles)
        if (!data || !data.text) return;

        const message = {
            text: data.text,              // ✅ match frontend
            sender: users[socket.id]      // User1, User2...
        };

        // 🔄 simulate network delay (congestion)
        const delay = Math.random() * 500 + 50;

        setTimeout(() => {

            // send to others
            socket.broadcast.emit("receive-message", message);

            // send ACK back to sender (for RTT tracking)
            socket.emit("ack", {
                time: Date.now()
            });

        }, delay);
    });

    socket.on("disconnect", () => {
        console.log(users[socket.id], "disconnected");
        delete users[socket.id];
    });

});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
