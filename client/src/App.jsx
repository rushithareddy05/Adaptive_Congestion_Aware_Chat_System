import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import RTTGraph from "./components/RTTGraph";
import "./App.css";

export default function App() {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [name, setName] = useState(""); // 🔥 NEW

  const [rttHistory, setRttHistory] = useState([]);
  const [rtt, setRtt] = useState(0);

  const [sent, setSent] = useState(0);
  const [received, setReceived] = useState(0);
  const [lost, setLost] = useState(0);

  const [congestion, setCongestion] = useState("LOW");
  const [slowMode, setSlowMode] = useState(false);

  const [myId, setMyId] = useState("");

  // ✅ GET SOCKET ID
  useEffect(() => {
    socket.on("connect", () => {
      setMyId(socket.id.slice(0, 5));
    });
  }, []);

  useEffect(() => {
  if (name.trim()) {
    socket.emit("set-name", name);
  }
  }, [name]);

  // 📥 RECEIVE MESSAGE
  useEffect(() => {

    socket.on("receive-message", (msg) => {

      if (!msg || !msg.text) return;

      setReceived(prev => prev + 1);

      setMessages(prev => [
        ...prev,
        {
          text: msg.text,
          sender: "other",
          name: msg.name || "User" // 🔥 NEW
        }
      ]);

      // RTT simulation
      const rttVal = Math.floor(Math.random() * 300) + 50;
      setRtt(rttVal);
      setRttHistory(prev => [...prev.slice(-10), rttVal]);

      if (rttVal < 150) {
        setCongestion("LOW");
        setSlowMode(false);
      } else if (rttVal < 300) {
        setCongestion("MEDIUM");
        setSlowMode(false);
      } else {
        setCongestion("HIGH");
        setSlowMode(true);
      }

    });

    return () => socket.off("receive-message");

  }, []);

  // 📤 SEND MESSAGE
  const sendMessage = () => {

    if (!input.trim()) return;

    setSent(prev => prev + 1);

    if (Math.random() < 0.1) {
      setLost(prev => prev + 1);
      setInput("");
      return;
    }

    socket.emit("send-message", {
      text: input,
      name: name || "Anonymous" // 🔥 NEW
    });

    setMessages(prev => [
      ...prev,
      {
        text: input,
        sender: "me",
        name: name || "You" // 🔥 NEW
      }
    ]);

    setInput("");
  };

  return (
    <div className="app">

      {/* LEFT CHAT PANEL */}
      <div className="chat-panel">

        <div className="chat-header">
          Adaptive Congestion Aware Chat Room | 🆔 {myId}
        </div>

        {/* 🔥 NAME INPUT */}
        <div className="name-bar">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="chat-box">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`bubble ${m.sender === "me" ? "me" : "other"}`}
            >
              {/* 🔥 SHOW NAME */}
              <div className="msg-name">{m.name}</div>
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

      {/* RIGHT DASHBOARD */}
      <div className="dashboard">

        <h2>📊 Network</h2>

        <RTTGraph dataPoints={rttHistory} />

        <p>RTT: {rtt} ms</p>

        <p>
          Congestion:
          <span className={congestion.toLowerCase()}>
            {" "}{congestion}
          </span>
        </p>

        {slowMode && (
          <div className="slow-alert">
            ⚠️ Slow Mode
          </div>
        )}

        <div className="loss-bar">
          <div
            className="loss-fill"
            style={{
              width: `${(lost / (sent || 1)) * 100}%`
            }}
          ></div>
        </div>

        <p>Loss: {lost}/{sent}</p>

        <p>Sent: {sent}</p>
        <p>Received: {received}</p>

      </div>

    </div>
  );
}
