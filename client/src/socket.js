import { io } from "socket.io-client";

export const socket = io("https://adaptive-congestion-aware-chat-system.onrender.com", {
  transports: ["websocket", "polling"],
  reconnection: true
});
