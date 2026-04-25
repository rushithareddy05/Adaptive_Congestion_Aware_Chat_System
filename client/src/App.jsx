import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import RTTGraph from "./components/RTTGraph";
import "./App.css";

export default function App() {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");

  const [waiting, setWaiting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const [users, setUsers] = useState([]);

  const [rtt, setRtt] = useState(0);
  const [rttHistory, setRttHistory] = useState([]);

  const [sent, setSent] = useState(0);
  const [received, setReceived] = useState(0);

  const [myId, setMyId] = useState("");

  // 🔷 CONNECTION
  useEffect(() => {

    socket.on("connect", () => {
      setMyId(socket.id.slice(0, 5));
    });

    socket.on("host-assigned", () => {
      setIsHost(true);
      setJoined(true);
    });

    socket.on("waiting-room", () => {
      setWaiting(true);
    });

    socket.on("approved", () => {
      setWaiting(false);
      setJoined(true);
    });

    socket.on("rejected", () => {
      alert("Access denied by host");
    });

    socket.on("kicked", () => {
      alert("You were removed by host");
      setJoined(false);
    });

    socket.on("user-list", (list) => {
      setUsers(list);
    });

    socket.on("receive-message", (msg) => {
      setReceived(p => p + 1);

      setMessages(prev => [
        ...prev,
        {
          text: msg.text,
          name: msg.name,
          sender: "other"
        }
      ]);

      const rttVal = Math.floor(Math.random() * 300) + 50;
      setRtt(rttVal);
      setRttHistory(prev => [...prev.slice(-10), rttVal]);
    });

    return () => socket.disconnect();

  }, []);

  // 🔷 SET NAME
  useEffect(() => {
    if (name) socket.emit("set-name", name);
  }, [name]);

  // 🔷 JOIN REQUEST
  const joinRequest = () => {
    setWaiting(true);
  };

  // 🔷 APPROVE USER (HOST)
  const approve = (id) => {
    socket.emit("approve-user", id);
  };

  // 🔷 REJECT USER (HOST)
  const reject = (id) => {
    socket.emit("reject-user", id);
  };

  // 🔷 KICK USER
  const kick = (id) => {
    socket.emit("kick-user", id);
  };

  // 🔷 SEND MESSAGE
  const send = () => {

    if (!input) return;

    setSent(p => p + 1);

    socket.emit("send-message", {
      text: input
    });

    setMessages(p => [
      ...p,
      { text: input, sender: "me", name }
    ]);

    setInput("");
  };

  // 🔴 JOIN SCREEN
  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-card">

          <h2>Group Chat Access</h2>

          <input
            placeholder="Enter name"
            onChange={(e) => setName(e.target.value)}
          />

          <button onClick={joinRequest}>
            Request Join
          </button>

          {waiting && <p>Waiting for host...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app">

      {/* CHAT */}
      <div className="chat-panel">

        <h3>Chat Room {isHost && "👑 HOST"}</h3>

        <div className="chat-box">
          {messages.map((m, i) => (
            <div key={i}>
              <b>{m.name}</b>: {m.text}
            </div>
          ))}
        </div>

        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <button onClick={send}>Send</button>

      </div>

      {/* HOST PANEL */}
      {isHost && (
        <div className="dashboard">

          <h3>Host Panel</h3>

          <h4>Users:</h4>

          {users.map(u => (
            <div key={u.id}>
              {u.name}
              <button onClick={() => kick(u.id)}>Kick</button>
            </div>
          ))}

        </div>
      )}

    </div>
  );
}
