import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';
import { fmtD } from '../utils/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export default function BetChart({ bets }) {
  const chartData = useMemo(() => {
    const closed = [...bets]
      .filter(b => b.status !== 'pending')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (!closed.length) return null;

    let cumul = 0;
    const labels = [];
    const values = [];
    closed.forEach(b => {
      cumul += b.pnl;
      labels.push(fmtD(b.created_at));
      values.push(parseFloat(cumul.toFixed(2)));
    });

    return {
      labels,
      datasets: [{
        data: values,
        borderColor: '#7c6bff',
        backgroundColor: 'rgba(124,107,255,0.08)',
        borderWidth: 2,
        pointRadius: closed.length > 30 ? 0 : 3,
        pointBackgroundColor: '#7c6bff',
        tension: 0.3,
        fill: true,
      }],
    };
  }, [bets]);

  if (!chartData) return null;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)} €` } } },
    scales: {
      x: { ticks: { color: '#5a5a72', font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#5a5a72', font: { size: 10 }, callback: v => `${v} €` }, grid: { color: 'rgba(255,255,255,0.04)' } },
    },
  };

  return (
    <div className="chart-card">
      <div className="chart-label">Évolution P&L cumulé</div>
      <div style={{ height: 220 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
