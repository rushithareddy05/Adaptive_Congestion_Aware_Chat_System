import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import RTTGraph from "./components/RTTGraph";
import "./App.css";

export default function App() {

  const [screen, setScreen] = useState("home");

  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const [rooms, setRooms] = useState([]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [rtt, setRtt] = useState(0);
  const [rttHistory, setRttHistory] = useState([]);

  const [congestion, setCongestion] = useState("LOW");

  const [sent, setSent] = useState(0);
  const [received, setReceived] = useState(0);
  const [lost, setLost] = useState(0);

  // ---------------- SOCKET ----------------
  useEffect(() => {

    socket.emit("get-rooms");

    socket.on("room-list", setRooms);

    socket.on("receive-message", (msg) => {

      setMessages((prev) => [...prev, msg]);

      setReceived((p) => p + 1);

      setRtt(msg.rtt);
      setCongestion(msg.congestion);

      setRttHistory((prev) => [...prev.slice(-15), msg.rtt]);

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

  // ---------------- CREATE ROOM ----------------
  const createRoom = () => {
    socket.emit("create-room", { name }, (res) => {
      setRoomId(res.roomId);
      setScreen("chat");
    });
  };

  // ---------------- JOIN ROOM ----------------
  const joinRoom = (id) => {
    socket.emit("join-room", { roomId: id, name }, (res) => {
      if (res.error) return alert(res.error);
      setRoomId(res.roomId);
      setScreen("chat");
    });
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = () => {

    if (!input.trim()) return;

    setSent((p) => p + 1);

    // packet loss simulation
    const isLost = Math.random() < 0.1;

    if (isLost) {
      setLost((p) => p + 1);
      setInput("");
      return;
    }

    socket.emit("send-message", {
      roomId,
      text: input,
      name
    });

    setInput("");
  };

  // ---------------- HOME ----------------
  if (screen === "home") {
    return (
      <div className="center">

        <div className="card">

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

      </div>
    );
  }

  // ---------------- JOIN ----------------
  if (screen === "join") {
    return (
      <div className="center">

        <div className="card">

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

      </div>
    );
  }

  // ---------------- CHAT ----------------
  return (
    <div className="layout">

      {/* LEFT DASHBOARD */}
      <div className="left-panel">

        <h2>📊 Network Panel</h2>

        <div className="stat">Room: {roomId}</div>
        <div className="stat">RTT: {rtt} ms</div>
        <div className={`stat ${congestion.toLowerCase()}`}>
          Congestion: {congestion}
        </div>

        <div className="stat">Sent: {sent}</div>
        <div className="stat">Received: {received}</div>
        <div className="stat">Packet Loss: {lost}</div>

        <div className="bar-container">
          <div
            className="bar"
            style={{
              width:
                congestion === "LOW"
                  ? "30%"
                  : congestion === "MEDIUM"
                  ? "60%"
                  : "90%"
            }}
          />
        </div>

        <RTTGraph data={rttHistory} />

        {congestion === "HIGH" && (
          <div className="slow">⚠ Slow Mode Active</div>
        )}

      </div>

      {/* CHAT PANEL */}
      <div className="chat-panel">

        <div className="chat-box">

          {messages.map((m, i) => {

            const isMe = m.name === name;
            const isSystem = m.name === "system";

            if (isSystem) {
              return (
                <div key={i} className="system">
                  {m.text}
                </div>
              );
            }

            return (
              <div
                key={i}
                className={`msg ${isMe ? "me" : "other"}`}
              >
                <div className="name">{m.name}</div>
                <div>{m.text}</div>
              </div>
            );

          })}

        </div>

        <div className="input">

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
          />

          <button onClick={sendMessage}>
            Send
          </button>

        </div>

      </div>

    </div>
  );
}
