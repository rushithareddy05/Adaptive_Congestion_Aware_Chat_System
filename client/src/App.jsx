import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import "./App.css";

export default function App() {

  // ---------------- USER STATE ----------------
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [waiting, setWaiting] = useState(false);

  // ---------------- CHAT STATE ----------------
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // ---------------- HOST REQUESTS ----------------
  const [requests, setRequests] = useState([]);

  // ---------------- SOCKET ID ----------------
  const [myId, setMyId] = useState("");

  // =================================================
  // SOCKET CONNECTION
  // =================================================
  useEffect(() => {

    socket.on("connect", () => {
      setMyId(socket.id.slice(0, 5));
    });

    // 👑 FIRST USER = HOST
    socket.on("you-are-host", () => {
      setIsHost(true);
      setJoined(true);
    });

    // 📩 JOIN REQUEST (only host receives)
    socket.on("join-request", (user) => {
      setRequests((prev) => [...prev, user]);
    });

    // ✅ APPROVED BY HOST
    socket.on("join-approved", () => {
      setWaiting(false);
      setJoined(true);
    });

    // ❌ REJECTED BY HOST
    socket.on("join-rejected", (msg) => {
      setWaiting(false);
      alert(msg || "Rejected by host");
    });

    // 💬 RECEIVE MESSAGE (GLOBAL ROOM)
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("connect");
      socket.off("you-are-host");
      socket.off("join-request");
      socket.off("join-approved");
      socket.off("join-rejected");
      socket.off("receive-message");
    };

  }, []);

  // =================================================
  // JOIN REQUEST
  // =================================================
  const handleJoin = () => {
    if (!name.trim()) return;

    socket.emit("request-join", name);
    setWaiting(true);
  };

  // =================================================
  // HOST ACTIONS
  // =================================================
  const approveUser = (id) => {
    socket.emit("approve-user", id);
    setRequests((prev) => prev.filter((u) => u.id !== id));
  };

  const rejectUser = (id) => {
    socket.emit("reject-user", id);
    setRequests((prev) => prev.filter((u) => u.id !== id));
  };

  // =================================================
  // SEND MESSAGE
  // =================================================
  const sendMessage = () => {
    if (!input.trim()) return;

    socket.emit("send-message", { text: input });

    setMessages((prev) => [
      ...prev,
      {
        text: input,
        name: "You"
      }
    ]);

    setInput("");
  };

  // =================================================
  // JOIN SCREEN (NON-HOST USERS)
  // =================================================
  if (!joined && !isHost) {
    return (
      <div className="join-container">

        <div className="join-card">

          <h2>🔐 Join Chat Room</h2>

          <p className="subtitle">
            Enter your name to request access
          </p>

          <input
            className="join-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />

          <button className="join-btn" onClick={handleJoin}>
            Request to Join
          </button>

          {waiting && (
            <div className="waiting-box">
              <div className="spinner"></div>
              <p>Waiting for host approval...</p>
            </div>
          )}

        </div>

      </div>
    );
  }

  // =================================================
  // HOST PANEL
  // =================================================
  if (isHost) {
    return (
      <div className="app" style={{ padding: 20 }}>

        <h2>👑 Host Panel</h2>

        {requests.length === 0 && <p>No pending requests</p>}

        {requests.map((u) => (
          <div
            key={u.id}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 10,
              alignItems: "center"
            }}
          >
            <span>{u.name}</span>

            <button onClick={() => approveUser(u.id)}>
              ✔ Accept
            </button>

            <button onClick={() => rejectUser(u.id)}>
              ❌ Reject
            </button>

          </div>
        ))}

      </div>
    );
  }

  // =================================================
  // CHAT UI (ALL USERS SHARE SAME ROOM)
  // =================================================
  return (
    <div className="app">

      {/* CHAT PANEL */}
      <div className="chat-panel">

        <div className="chat-header">
          💬 Group Chat | 🆔 {myId}
        </div>

        <div className="chat-box">
          {messages.map((m, i) => (
            <div key={i} className="bubble other">

              <div className="msg-name">
                {m.name}
              </div>

              {m.text}

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
