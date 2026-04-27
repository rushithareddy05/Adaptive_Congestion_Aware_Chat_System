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

  const [waiting, setWaiting] = useState(false);
  const [rejected, setRejected] = useState(false);

  const [congestion, setCongestion] = useState("LOW");
  const [slowMode, setSlowMode] = useState(false);

  const [isBlocked, setIsBlocked] = useState(false);
  const [slowMsg, setSlowMsg] = useState("");

  const [sent, setSent] = useState(0);
  const [received, setReceived] = useState(0);
  const [lost, setLost] = useState(0);

  const [joinRequests, setJoinRequests] = useState([]);

  // ✅ NEW
  const [roomUsers, setRoomUsers] = useState([]);

  // ---------------- SOCKET SETUP ----------------
  useEffect(() => {
    socket.emit("get-rooms");

    const handleRoomList = (data) => setRooms(data);

    const handleJoinRequest = (data) => {
      setJoinRequests((prev) => {
        const exists = prev.find((r) => r.id === data.id);
        if (exists) return prev;
        return [...prev, data];
      });
    };

    const handleApproved = ({ roomId }) => {
      setWaiting(false);
      setRejected(false);
      setRoomId(roomId);
      setScreen("chat");
    };

    const handleRejected = () => {
      setWaiting(false);
      setRejected(true);
      setTimeout(() => setRejected(false), 3000);
    };

    const handleMessage = (msg) => {
      setMessages((p) => [...p, msg]);
      setReceived((p) => p + 1);

      setRtt(msg.rtt);
      setCongestion(msg.congestion);
      setRttHistory((p) => [...p.slice(-20), msg.rtt]);

      if (msg.rtt > 200) {
        setSlowMode(true);
        clearTimeout(window.__slowModeTimer);
        window.__slowModeTimer = setTimeout(() => {
          setSlowMode(false);
        }, 2500);
      }
    };

    const handleSystem = (msg) => {
      setMessages((p) => [...p, msg]);
    };

    const handleSlowMode = (data) => {
      setIsBlocked(true);
      setSlowMsg(data.message || "Slow mode active");

      setTimeout(() => {
        setIsBlocked(false);
        setSlowMsg("");
      }, 3000);
    };

    // ✅ NEW
    const handleRoomUsers = (users) => setRoomUsers(users);

    const handleKicked = (data) => {
      alert(data.message || "Removed by host");
      setScreen("home");
    };

    const handleBanned = (data) => {
      alert(data.message || "You are banned");
      setScreen("home");
    };

    socket.on("room-list", handleRoomList);
    socket.on("join-request", handleJoinRequest);
    socket.on("approved", handleApproved);
    socket.on("rejected", handleRejected);
    socket.on("receive-message", handleMessage);
    socket.on("system-message", handleSystem);
    socket.on("slow-mode", handleSlowMode);

    // ✅ NEW
    socket.on("room-users", handleRoomUsers);
    socket.on("kicked", handleKicked);
    socket.on("banned", handleBanned);

    return () => {
      socket.off("room-list", handleRoomList);
      socket.off("join-request", handleJoinRequest);
      socket.off("approved", handleApproved);
      socket.off("rejected", handleRejected);
      socket.off("receive-message", handleMessage);
      socket.off("system-message", handleSystem);
      socket.off("slow-mode", handleSlowMode);

      socket.off("room-users", handleRoomUsers);
      socket.off("kicked", handleKicked);
      socket.off("banned", handleBanned);
    };
  }, []);

  // ---------------- ACTIONS ----------------
  const createRoom = () => {
    socket.emit("create-room", { name }, (res) => {
      if (!res?.roomId) return;
      setRoomId(res.roomId);
      setScreen("chat");
    });
  };

  const joinRoom = (id) => {
    setWaiting(true);
    setRejected(false);

    socket.emit("join-room", { roomId: id, name }, (res) => {
      if (res?.error) {
        setWaiting(false);
        alert(res.error);
      }
    });
  };

  const sendMessage = () => {
    if (!input.trim() || isBlocked) return;

    setSent((p) => p + 1);

    const lostPacket = Math.random() < 0.08;
    if (lostPacket) {
      setLost((p) => p + 1);
      setInput("");
      return;
    }

    socket.emit("send-message", { roomId, text: input, name });
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

  // ✅ NEW
  const kickUser = (userId) => {
    socket.emit("kick-user", { roomId, userId });
  };

  const banUser = (userId) => {
    socket.emit("ban-user", { roomId, userId });
  };

  // ---------------- CHAT ----------------
  return (
    <div className={`layout ${slowMode ? "slowMode" : ""}`}>
      <div className="left">
        <h3>📊 Network Monitor</h3>

        <div className="box">Room: {roomId}</div>
        <div className="box">RTT: {rtt} ms</div>
        <div className="box">Congestion: {congestion}</div>

        <div className="box">Sent: {sent}</div>
        <div className="box">Received: {received}</div>
        <div className="box">Packet Loss: {lost}</div>

        <RTTGraph dataPoints={rttHistory} />

        {/* EXISTING JOIN REQUESTS */}
        {joinRequests.length > 0 && (
          <div className="adminBox">
            <h4>Join Requests</h4>

            {joinRequests.map((r, i) => (
              <div key={i} className="requestCard">
                <b>{r.name}</b>
                <div className="reqBtns">
                  <button onClick={() => approveUser(r.id, r.roomId)}>✔</button>
                  <button onClick={() => rejectUser(r.id)}>✖</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ✅ NEW ACTIVE USERS (ADDED, NOT REPLACED) */}
        {roomUsers.length > 0 && (
          <div className="adminBox">
            <h4>Active Users</h4>

            {roomUsers.map((u, i) => {
              const isMe = u.name === name;

              return (
                <div key={i} className="requestCard">
                  <b>
                    {u.name} {isMe && "(You)"} {i === 0 && "👑"}
                  </b>

                  {!isMe && (
                    <div className="reqBtns">
                      <button onClick={() => kickUser(u.id)}>👢</button>
                      <button onClick={() => banUser(u.id)}>🚫</button>
                    </div>
                  )}
                </div>
              );
            })}
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

        {isBlocked && (
          <div style={{ color: "#ef4444", padding: "5px" }}>
            ⚠ {slowMsg}
          </div>
        )}

        <div className="input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage} disabled={isBlocked}>
            {isBlocked ? "Slow..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
