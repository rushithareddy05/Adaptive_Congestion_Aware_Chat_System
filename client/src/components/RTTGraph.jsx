import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

export default function RTTGraph({ dataPoints = [] }) {

  const data = {
    labels: dataPoints.map((_, i) => i + 1),
    datasets: [
      {
        label: "RTT (ms)",
        data: dataPoints,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.2)",
        fill: true,
        tension: 0.4,
        pointRadius: 3
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: "white" }
      }
    },
    scales: {
      x: { ticks: { color: "white" } },
      y: { ticks: { color: "white" } }
    }
  };

  return <Line data={data} options={options} />;
}
