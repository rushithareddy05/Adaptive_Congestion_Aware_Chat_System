export default function RTTGraph({ dataPoints = [] }) {
  const safeData = dataPoints.slice(-15);
  const max = Math.max(...safeData, 100);

  return (
    <div style={{ marginTop: "10px" }}>
      
      {/* TITLE */}
      <div style={{ fontSize: "12px", marginBottom: "5px" }}>
        RTT Trend
      </div>

      {/* WRAPPER */}
      <div style={{ position: "relative" }}>

        {/* Y AXIS */}
        <div
          style={{
            position: "absolute",
            left: "0",
            top: "0",
            height: "80px",
            width: "35px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontSize: "10px",
            opacity: 0.7,
          }}
        >
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>

        {/* GRAPH */}
        <div
          style={{
            display: "flex",
            gap: "3px",
            alignItems: "flex-end",
            height: "80px",
            background: "#0f1a22",
            padding: "5px",
            borderRadius: "8px",
            marginLeft: "40px",
          }}
        >
          {safeData.map((v, i) => (
            <div
              key={i}
              title={`${v} ms`}
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
                transition: "height 0.2s ease",
              }}
            />
          ))}
        </div>

        {/* X AXIS */}
        <div
          style={{
            marginLeft: "40px",
            marginTop: "4px",
            fontSize: "10px",
            opacity: 0.7,
            display: "flex",
            justifyContent: "space-between",
            width: "calc(100% - 40px)",
          }}
        >
          <span>Old</span>
          <span>New</span>
        </div>

      </div>
    </div>
  );
}
