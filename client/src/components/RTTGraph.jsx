export default function RTTGraph({ dataPoints = [] }) {
  const safeData = dataPoints.slice(-15);

  const max = Math.max(...safeData, 100); // prevent divide issues

  return (
    <div style={{ marginTop: "10px" }}>
      
      <div style={{ fontSize: "12px", marginBottom: "5px" }}>
        RTT Trend
      </div>

      <div
        style={{
          display: "flex",
          gap: "3px",
          alignItems: "flex-end",
          height: "80px",
          background: "#0f1a22",
          padding: "5px",
          borderRadius: "8px"
        }}
      >
        {safeData.map((v, i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: `${(v / max) * 80}px`,
              background:
                v < 120
                  ? "#22c55e"
                  : v < 220
                  ? "#facc15"
                  : "#ef4444",
              borderRadius: "2px",
              transition: "height 0.2s"
            }}
          />
        ))}
      </div>
    </div>
  );
}
