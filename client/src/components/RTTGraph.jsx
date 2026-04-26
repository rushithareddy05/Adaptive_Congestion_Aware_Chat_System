import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale);

export default function RTTGraph({ dataPoints }) {

  const data = {
    labels: dataPoints.map((_, i) => i),
    datasets: [
      {
        label: "RTT (ms)",
        data: dataPoints,
        tension: 0.3
      }
    ]
  };

  return <Line data={data} />;
}
