export default function RTTGraph({ dataPoints = [] }) {
  return (
    <div style={{ marginTop: "10px" }}>
      <div style={{ fontSize: "12px", marginBottom: "5px" }}>
        RTT Trend
      </div>

      <div style={{ display: "flex", gap: "3px", alignItems: "flex-end" }}>
        {dataPoints.slice(-15).map((v, i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: `${v / 2}px`,
              background: "#22c55e",
              borderRadius: "2px"
            }}
          />
        ))}
      </div>
    </div>
  );
}
