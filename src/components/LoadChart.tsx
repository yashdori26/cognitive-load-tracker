import { useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface LoadChartProps {
  loadHistory: number[];
}

export const LoadChart = ({ loadHistory }: LoadChartProps) => {
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update('none');
    }
  }, [loadHistory]);

  const data = {
    labels: loadHistory.map((_, i) => ''),
    datasets: [
      {
        label: 'Cognitive Load',
        data: loadHistory,
        borderColor: 'hsl(189, 100%, 50%)',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'hsla(189, 100%, 50%, 0.3)');
          gradient.addColorStop(1, 'hsla(189, 100%, 30%, 0)');
          return gradient;
        },
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'hsl(220, 18%, 10%)',
        borderColor: 'hsl(189, 100%, 50%)',
        borderWidth: 1,
        titleColor: 'hsl(180, 100%, 90%)',
        bodyColor: 'hsl(180, 100%, 90%)',
        callbacks: {
          label: (context: any) => `Load: ${context.parsed.y.toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'hsl(220, 15%, 18%)',
          lineWidth: 1,
        },
        ticks: {
          color: 'hsl(180, 20%, 65%)',
          font: {
            family: 'monospace',
            size: 11,
          },
          callback: (value: any) => `${value}%`,
        },
      },
    },
    animation: {
      duration: 0,
    },
  };

  return (
    <div className="bg-card border border-border rounded p-6 h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground uppercase tracking-wider">
          Load Timeline
        </h2>
        <div className="text-xs text-muted-foreground">
          {loadHistory.length} samples
        </div>
      </div>
      <div className="h-[320px]">
        <Line ref={chartRef} data={data} options={options} />
      </div>
    </div>
  );
};
