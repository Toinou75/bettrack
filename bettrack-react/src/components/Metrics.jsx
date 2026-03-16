import { fmt } from '../utils/format';

export default function Metrics({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: 'P&L', val: fmt(stats.pnl), cls: stats.pnl >= 0 ? 'g' : 'r', valCls: stats.pnl >= 0 ? 'pos' : 'neg' },
    { label: 'Gains', val: stats.wins, cls: 'g' },
    { label: 'Pertes', val: stats.losses, cls: 'r' },
    { label: 'Win rate', val: stats.rate ? `${stats.rate}%` : '—', cls: '' },
    { label: 'ROI', val: stats.roi ? `${stats.roi}%` : '—', cls: stats.roi > 0 ? 'g' : stats.roi < 0 ? 'r' : '', valCls: stats.roi > 0 ? 'pos' : stats.roi < 0 ? 'neg' : '' },
    { label: 'Misé', val: `${stats.staked.toFixed(2)} €`, cls: 'b' },
    { label: 'Freebets', val: stats.fbCount, cls: 'a', sub: stats.fbGain > 0 ? `+${stats.fbGain.toFixed(2)} € gagnés` : null },
    { label: 'CLV moyen', val: stats.avgCLV !== null ? `${stats.avgCLV.toFixed(2)}%` : '—', cls: 'b', sub: stats.clvCount > 0 ? `${stats.clvCount} paris` : null },
  ];

  return (
    <div className="metrics">
      {cards.map(c => (
        <div key={c.label} className={`mc ${c.cls}`}>
          <div className="mc-label">{c.label}</div>
          <div className={`mc-val ${c.valCls || ''}`}>{c.val}</div>
          {c.sub && <div className="mc-sub">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
