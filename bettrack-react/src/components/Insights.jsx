import { fmt } from '../utils/format';

export default function Insights({ insights }) {
  if (!insights) return null;

  const { streak, streakType, bestRun, worstRun } = insights;

  return (
    <div className="insights">
      <div className="insight-card">
        <div className="insight-label">Série actuelle</div>
        <div className={`insight-val ${streakType === 'win' ? 'pos' : 'neg'}`}>
          {streak} {streakType === 'win' ? 'victoire' : 'défaite'}{streak > 1 ? 's' : ''}
        </div>
      </div>
      {bestRun.start && (
        <div className="insight-card">
          <div className="insight-label">Meilleure série (5)</div>
          <div className="insight-val pos">{fmt(bestRun.pnl)}</div>
          <div className="insight-sub">{bestRun.start} → {bestRun.end}</div>
        </div>
      )}
      {worstRun.start && (
        <div className="insight-card">
          <div className="insight-label">Pire série (5)</div>
          <div className="insight-val neg">{fmt(worstRun.pnl)}</div>
          <div className="insight-sub">{worstRun.start} → {worstRun.end}</div>
        </div>
      )}
    </div>
  );
}
