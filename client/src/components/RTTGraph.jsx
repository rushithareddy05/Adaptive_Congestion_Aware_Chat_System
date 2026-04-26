import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function RTTGraph({ data }) {
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data.map((v, i) => ({ name: i, rtt: v }))}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="rtt" stroke="#22c55e" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
