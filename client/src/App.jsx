import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import "./App.css";

export default function App() {

  const [screen, setScreen] = useState("home");

  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [rtt, setRtt] = useState(0);
  const [congestion, setCongestion] = useState("LOW");

  // 📡 GET ROOM LIST
  useEffect(() => {

    socket.emit("get-rooms");

    socket.on("room-list", (list) => {
      setRooms(list);
    });

    socket.on("receive-message", (msg) => {

      setMessages((prev) => [...prev, msg]);

      setRtt(msg.rtt);
      setCongestion(msg.congestion);

    });

    socket.on("system-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("room-list");
      socket.off("receive-message");
      socket.off("system-message");
    };

  }, []);

  // CREATE ROOM
  const createRoom = () => {

    socket.emit("create-room", { name }, (res) => {
      setRoomId(res.roomId);
      setScreen("chat");
    });

  };

  // JOIN ROOM
  const joinRoom = (id) => {

    socket.emit("join-room", { roomId: id, name }, (res) => {

      if (res.error) return alert(res.error);

      setRoomId(res.roomId);
      setScreen("chat");

    });

  };

  // SEND MESSAGE
  const sendMessage = () => {

    socket.emit("send-message", {
      roomId,
      text: input,
      name
    });

    setInput("");
  };

  // ---------------- UI ----------------

  if (screen === "home") {
    return (
      <div className="center">

        <h1>💬 Chat System</h1>

        <input
          placeholder="Enter name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button onClick={createRoom}>
          Create Room
        </button>

        <button onClick={() => setScreen("join")}>
          Join Room
        </button>

      </div>
    );
  }

  // ROOM LIST SCREEN
  if (screen === "join") {
    return (
      <div className="center">

        <h2>Available Rooms</h2>

        {rooms.length === 0 && <p>No rooms available</p>}

        {rooms.map((r, i) => (
          <button key={i} onClick={() => joinRoom(r)}>
            Join {r}
          </button>
        ))}

        <button onClick={() => setScreen("home")}>
          Back
        </button>

      </div>
    );
  }

  // CHAT SCREEN
  return (
    <div className="chat-container">

      <div className="header">
        Room: {roomId}
      </div>

      <div className="status">
        RTT: {rtt} ms | Congestion: {congestion}
      </div>

      <div className="chat-box">

        {messages.map((m, i) => (
          <div key={i} className="msg-wrapper">
            <div className="msg-name">{m.name}</div>
            <div className="msg-bubble">{m.text}</div>
          </div>
        ))}

      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="message..."
        />

        <button onClick={sendMessage}>
          Send
        </button>
      </div>

    </div>
  );
}
