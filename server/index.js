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

io.on("connection", (socket) => {

    // default username
    const defaultName = "User" + userCount++;
    users[socket.id] = defaultName;

    console.log(defaultName, "connected");

    // send initial name
    socket.emit("your-name", defaultName);

    // 🔥 RECEIVE CUSTOM NAME FROM FRONTEND
    socket.on("set-name", (name) => {
        if (name && name.trim()) {
            users[socket.id] = name.trim();
        }
    });

    // 📤 RECEIVE MESSAGE
    socket.on("send-message", (data) => {

        if (!data || !data.text) return;

        const message = {
            text: data.text,
            name: users[socket.id] // 🔥 send name instead of sender
        };

        const delay = Math.random() * 500 + 50;

        setTimeout(() => {

            // send to others
            socket.broadcast.emit("receive-message", message);

            // ACK for RTT
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
