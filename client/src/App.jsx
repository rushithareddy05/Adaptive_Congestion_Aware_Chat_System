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

  const [rttHistory, setRttHistory] = useState([]);
  const [rtt, setRtt] = useState(0);

  const [congestion, setCongestion] = useState("LOW");

  const [sent, setSent] = useState(0);
  const [received, setReceived] = useState(0);
  const [lost, setLost] = useState(0);

  const [joinRequests, setJoinRequests] = useState([]);

  useEffect(() => {
    socket.emit("get-rooms");

    socket.on("room-list", setRooms);

    socket.on("join-request", (data) => {
      setJoinRequests((p) => [...p, data]);
    });

    socket.on("receive-message", (msg) => {
      setMessages((p) => [...p, msg]);
      setReceived((p) => p + 1);

      setRtt(msg.rtt);
      setCongestion(msg.congestion);

      setRttHistory((p) => [...p.slice(-20), msg.rtt]);
    });

    socket.on("system-message", (msg) => {
      setMessages((p) => [...p, msg]);
    });

    return () => {
      socket.off("room-list");
      socket.off("receive-message");
      socket.off("system-message");
      socket.off("join-request");
    };
  }, []);

  const createRoom = () => {
    socket.emit("create-room", { name }, (res) => {
      setRoomId(res.roomId);
      setScreen("chat");
    });
  };

  const joinRoom = (id) => {
    socket.emit("join-room", { roomId: id, name }, (res) => {
      if (res.error) return alert(res.error);
      setRoomId(res.roomId);
      setScreen("chat");
    });
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    setSent((p) => p + 1);

    const lostPacket = Math.random() < 0.08;
    if (lostPacket) {
      setLost((p) => p + 1);
      setInput("");
      return;
    }

    socket.emit("send-message", {
      roomId,
      text: input,
      name,
    });

    setInput("");
  };

  const approveUser = (userId, roomId) => {
    socket.emit("approve-user", { userId, roomId });
    setJoinRequests((p) => p.filter((r) => r.id !== userId));
  };

  const rejectUser = (userId) => {
    socket.emit("reject-user", { userId });
    setJoinRequests((p) => p.filter((r) => r.id !== userId));
  };

  /* ---------------- HOME ---------------- */
  if (screen === "home") {
    return (
      <div className="center">
        <div className="homeCard">

          <div className="logoTitle">💬 Chat System</div>

          <div className="subText">
            Real-time congestion-aware chat system
          </div>

          <input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="actionCard create" onClick={createRoom}>
            <div className="icon">🚀</div>
            <div>
              <div className="title">Create Room</div>
              <div className="desc">Start new chat session</div>
            </div>
          </div>

          <div className="actionCard join" onClick={() => setScreen("join")}>
            <div className="icon">📡</div>
            <div>
              <div className="title">Join Room</div>
              <div className="desc">Join existing room</div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  /* ---------------- JOIN ---------------- */
  if (screen === "join") {
    return (
      <div className="center">
        <div className="homeCard">

          <div className="logoTitle">📡 Rooms</div>

          {rooms.length === 0 && (
            <div className="subText">No active rooms</div>
          )}

          {rooms.map((r, i) => (
            <div key={i} className="roomBox" onClick={() => joinRoom(r)}>
              🚪 Room {r}
            </div>
          ))}

          <div
            className="actionCard back"
            onClick={() => setScreen("home")}
          >
            ← Back
          </div>

        </div>
      </div>
    );
  }

  /* ---------------- CHAT ---------------- */
  return (
    <div className="layout">

      <div className="left">
        <h3>📊 Network Monitor</h3>

        <div className="box">Room: {roomId}</div>
        <div className="box">RTT: {rtt} ms</div>
        <div className="box">Congestion: {congestion}</div>

        <div className="box">Sent: {sent}</div>
        <div className="box">Received: {received}</div>
        <div className="box">Packet Loss: {lost}</div>

        <div className="bar">
          <div
            className="fill"
            style={{
              width:
                congestion === "LOW"
                  ? "30%"
                  : congestion === "MEDIUM"
                  ? "60%"
                  : "100%",
              background:
                congestion === "LOW"
                  ? "#22c55e"
                  : congestion === "MEDIUM"
                  ? "#facc15"
                  : "#ef4444",
            }}
          />
        </div>

        <RTTGraph dataPoints={rttHistory} />

        {joinRequests.length > 0 && (
          <div className="adminBox">
            <h4>Join Requests</h4>

            {joinRequests.map((r, i) => (
              <div key={i} className="requestCard">
                <b>{r.name}</b>
                <div className="reqBtns">
                  <button onClick={() => approveUser(r.id, r.roomId)} className="approve">✔</button>
                  <button onClick={() => rejectUser(r.id)} className="reject">✖</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="right">
        <div className="chat">

          {messages.map((m, i) => {
            if (m.name === "system") {
              return (
                <div key={i} className="system">
                  {m.text}
                </div>
              );
            }

            const isMe = m.name === name;

            return (
              <div key={i} className={`msgContainer ${isMe ? "me" : "other"}`}>
                <div className="msgBubble">
                  <div className="msgName">{m.name}</div>
                  <div className="msgText">{m.text}</div>
                </div>
              </div>
            );
          })}

        </div>

        <div className="input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>

      </div>

    </div>
  );
}
