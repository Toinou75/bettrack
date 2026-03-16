import { fmt } from '../utils/format';

function BreakdownGrid({ title, icon, data }) {
  const entries = Object.entries(data).sort((a, b) => b[1].pnl - a[1].pnl);
  if (!entries.length) return null;

  return (
    <div className="breakdown-section">
      <div className="breakdown-title">{icon} {title}</div>
      <div className="breakdown-grid">
        {entries.map(([name, s]) => {
          const rate = s.count ? ((s.wins / s.count) * 100).toFixed(0) : 0;
          const roi = s.staked > 0 ? ((s.pnl / s.staked) * 100).toFixed(1) : '—';
          return (
            <div key={name} className="bd-card">
              <div className="bd-card-title">{name}</div>
              <div className="bd-row"><span>P&L</span><span className={s.pnl >= 0 ? 'pos' : 'neg'}>{fmt(s.pnl)}</span></div>
              <div className="bd-row"><span>Win rate</span><span>{rate}%</span></div>
              <div className="bd-row"><span>ROI</span><span>{roi}%</span></div>
              <div className="bd-row"><span>Paris</span><span>{s.count}</span></div>
              <div className="bd-bar">
                <div className="bd-bar-fill" style={{ width: `${rate}%`, background: s.pnl >= 0 ? 'var(--green)' : 'var(--red)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Breakdowns({ stats }) {
  if (!stats) return null;
  return (
    <>
      <BreakdownGrid title="Par bookmaker" icon="📚" data={stats.byBook} />
      <BreakdownGrid title="Par sport" icon="⚽" data={stats.bySport} />
    </>
  );
}
