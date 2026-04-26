import React, { useEffect, useState } from "react";
import { socket } from "./socket";
import "./App.css";

export default function App() {

  const [screen, setScreen] = useState("home"); 
  // home | create | join | chat

  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [inputRoom, setInputRoom] = useState("");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [myRoom, setMyRoom] = useState("");
  const [isHost, setIsHost] = useState(false);

  // RECEIVE MESSAGES
  useEffect(() => {

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("system-message", (msg) => {
      setMessages((prev) => [...prev, { name: "system", text: msg.text }]);
    });

    return () => {
      socket.off("receive-message");
      socket.off("system-message");
    };

  }, []);

  // CREATE ROOM
  const createRoom = () => {
    if (!name.trim()) return;

    socket.emit("create-room", { name }, (res) => {
      setRoomId(res.roomId);
      setMyRoom(res.roomId);
      setIsHost(true);
      setScreen("chat");
    });
  };

  // JOIN ROOM
  const joinRoom = () => {
    if (!name.trim() || !inputRoom.trim()) return;

    socket.emit(
      "join-room",
      { roomId: inputRoom, name },
      (res) => {

        if (res.error) {
          alert(res.error);
          return;
        }

        setRoomId(res.roomId);
        setMyRoom(res.roomId);
        setIsHost(false);
        setScreen("chat");
      }
    );
  };

  // SEND MESSAGE
  const sendMessage = () => {
    if (!input.trim()) return;

    socket.emit("send-message", {
      roomId: myRoom,
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
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button onClick={() => setScreen("create")}>
          Create Room
        </button>

        <button onClick={() => setScreen("join")}>
          Join Room
        </button>

      </div>
    );
  }

  if (screen === "create") {
    return (
      <div className="center">

        <h2>Create Room</h2>

        <button onClick={createRoom}>
          Generate Room
        </button>

      </div>
    );
  }

  if (screen === "join") {
    return (
      <div className="center">

        <h2>Join Room</h2>

        <input
          placeholder="Enter Room ID"
          value={inputRoom}
          onChange={(e) => setInputRoom(e.target.value)}
        />

        <button onClick={joinRoom}>
          Join
        </button>

      </div>
    );
  }

  // CHAT SCREEN
  return (
    <div className="chat-container">

      <div className="header">
        Room: {roomId} {isHost && "👑 Host"}
      </div>

      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className="msg">
            <b>{m.name}:</b> {m.text}
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
