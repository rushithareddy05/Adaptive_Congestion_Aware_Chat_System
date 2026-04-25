return (
  <div className="app">

    {/* 🔥 MODERN JOIN SCREEN */}
    {!joined && (
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

          <button
            className="join-btn"
            onClick={handleJoin}
          >
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
    )}

    {/* 🔥 MAIN CHAT */}
    {joined && (
      <>
        <div className="chat-panel">

          <div className="chat-header">
            💬 Chat | 🆔 {myId}
          </div>

          <div className="chat-box">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`bubble ${m.sender === "me" ? "me" : "other"}`}
              >
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
      </>
    )}

  </div>
);
