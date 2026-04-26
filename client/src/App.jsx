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

  const [requests, setRequests] = useState([]);

  const [rtt, setRtt] = useState(0);
  const [congestion, setCongestion] = useState("LOW");

  // SOCKET
  useEffect(() => {

    socket.emit("get-rooms");

    socket.on("room-list", setRooms);

    socket.on("join-request", (user) => {
      setRequests((prev) => [...prev, user]);
    });

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setRtt(msg.rtt);
      setCongestion(msg.congestion);
    });

    socket.on("system-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

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
      if (res.status === "pending") alert("Waiting for host...");
      if (res.roomId) {
        setRoomId(res.roomId);
        setScreen("chat");
      }
    });
  };

  // APPROVE
  const approve = (user) => {
    socket.emit("approve-user", {
      roomId,
      userId: user.id
    });
    setRequests((r) => r.filter(x => x.id !== user.id));
  };

  // REJECT
  const reject = (user) => {
    socket.emit("reject-user", {
      userId: user.id
    });
    setRequests((r) => r.filter(x => x.id !== user.id));
  };

  // SEND
  const sendMessage = () => {
    socket.emit("send-message", {
      roomId,
      text: input,
      name
    });
    setInput("");
  };

  // HOME
  if (screen === "home") {
    return (
      <div className="center">
        <h1>Chat System</h1>

        <input value={name} onChange={(e) => setName(e.target.value)} />

        <button onClick={createRoom}>Create Room</button>

        <button onClick={() => setScreen("join")}>
          Join Room
        </button>
      </div>
    );
  }

  // JOIN SCREEN
  if (screen === "join") {
    return (
      <div className="center">
        <h2>Rooms</h2>

        {rooms.map((r) => (
          <button key={r} onClick={() => joinRoom(r)}>
            Join {r}
          </button>
        ))}
      </div>
    );
  }

  // CHAT
  return (
    <div className="layout">

      {/* LEFT DASHBOARD */}
      <div className="left-panel">

        <h3>Room: {roomId}</h3>
        <p>RTT: {rtt}</p>
        <p>Congestion: {congestion}</p>

        {/* HOST REQUEST PANEL */}
        {requests.map((u) => (
          <div key={u.id}>
            {u.name}
            <button onClick={() => approve(u)}>✔</button>
            <button onClick={() => reject(u)}>✖</button>
          </div>
        ))}

      </div>

      {/* CHAT */}
      <div className="chat-panel">

        <div className="chat-box">

          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.name === name ? "me" : "other"}`}>
              <div className="msg-name">{m.name}</div>
              {m.text}
            </div>
          ))}

        </div>

        <div className="input-area">
          <input value={input} onChange={(e) => setInput(e.target.value)} />
          <button onClick={sendMessage}>Send</button>
        </div>

      </div>

    </div>
  );
}
