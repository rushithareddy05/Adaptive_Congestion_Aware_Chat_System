import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import "./App.css";

export default function App() {

  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [requests, setRequests] = useState([]);
  const [myId, setMyId] = useState("");

  // ---------------- SOCKET ----------------
  useEffect(() => {

    socket.on("connect", () => {
      setMyId(socket.id.slice(0, 5));
    });

    // 👑 HOST DETECTION
    socket.on("you-are-host", () => {
      setIsHost(true);
      setJoined(true);
      setWaiting(false);
    });

    // 📩 JOIN REQUEST (ONLY HOST RECEIVES)
    socket.on("join-request", (user) => {
      setRequests((prev) => [...prev, user]);
    });

    // ✅ APPROVED
    socket.on("join-approved", () => {
      setWaiting(false);
      setJoined(true);
    });

    // ❌ REJECTED
    socket.on("join-rejected", (msg) => {
      setWaiting(false);
      alert(msg);
    });

    // 💬 MESSAGES
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

  }, []);

  // ---------------- JOIN REQUEST ----------------
  const handleJoin = () => {
    if (!name.trim()) return;

    socket.emit("request-join", name);
    setWaiting(true);
  };

  // ---------------- HOST ACTIONS ----------------
  const approveUser = (id) => {
    socket.emit("approve-user", id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const rejectUser = (id) => {
    socket.emit("reject-user", id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = () => {
    if (!input.trim()) return;

    socket.emit("send-message", { text: input });

    setMessages((prev) => [
      ...prev,
      { text: input, name: "You" }
    ]);

    setInput("");
  };

  // ---------------- JOIN SCREEN ----------------
  if (!joined && !isHost) {
    return (
      <div className="join-container">

        <div className="join-card">

          <h2>Join Chat Room</h2>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />

          <button onClick={handleJoin}>
            Request Join
          </button>

          {waiting && <p>⏳ Waiting for host approval...</p>}

        </div>

      </div>
    );
  }

  // ---------------- HOST PANEL ----------------
  if (isHost) {
    return (
      <div style={{ padding: 20 }}>

        <h2>👑 You are the HOST</h2>

        {requests.map((r) => (
          <div key={r.id} style={{ margin: 10 }}>
            <b>{r.name}</b>

            <button onClick={() => approveUser(r.id)}>
              Accept
            </button>

            <button onClick={() => rejectUser(r.id)}>
              Reject
            </button>
          </div>
        ))}

        <hr />

        <div className="chat-box">
          {messages.map((m, i) => (
            <div key={i} className="bubble">
              <b>{m.name}:</b> {m.text}
            </div>
          ))}
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="message..."
        />

        <button onClick={sendMessage}>
          Send
        </button>

      </div>
    );
  }

  // ---------------- NORMAL USER CHAT ----------------
  return (
    <div className="app">

      <div className="chat-panel">

        <div className="chat-header">
          💬 Chat | 🆔 {myId}
        </div>

        <div className="chat-box">
          {messages.map((m, i) => (
            <div key={i} className="bubble">
              <b>{m.name}</b>
              <div>{m.text}</div>
            </div>
          ))}
        </div>

        <div className="input-area">
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
