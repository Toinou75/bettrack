import { useEffect, useMemo, useState } from 'react';
import useBetStore from '../stores/betStore';
import useUserStore from '../stores/userStore';
import { getLeaderboard, getAllProfiles } from '../services/supabase';
import { fmt, ini } from '../utils/format';

const COLORS = ['#7c6bff', '#00e699', '#ff4d6a', '#ffb84d', '#38bdf8', '#e879f9', '#f97316'];

export default function Leaderboard() {
  const { user } = useUserStore();
  const { allUsersBets, fetchAllBets } = useBetStore();
  const [rankings, setRankings] = useState([]);
  const [users, setUsers] = useState([]);
  const [useRpc, setUseRpc] = useState(true);

  useEffect(() => {
    // Try RPC first, fallback to client-side computation
    getLeaderboard().then(data => {
      if (data) {
        setRankings(data.map((r, i) => ({ ...r, color: COLORS[i % COLORS.length] })));
      } else {
        setUseRpc(false);
        fetchAllBets();
        getAllProfiles().then(setUsers);
      }
    });
  }, [fetchAllBets]);

  // Fallback: client-side ranking (if RPC not available)
  const fallbackRankings = useMemo(() => {
    if (useRpc) return [];
    return users.map((u, i) => {
      const userBets = allUsersBets.filter(b => b.user_name === u.username);
      const closed = userBets.filter(b => b.status !== 'pending');
      const wins = closed.filter(b => b.status === 'win').length;
      const pnl = closed.reduce((a, b) => a + b.pnl, 0);
      const staked = userBets.filter(b => !b.is_freebet).reduce((a, b) => a + b.stake, 0);
      const roi = staked > 0 ? ((pnl / staked) * 100).toFixed(1) : '0.0';
      return { ...u, pnl, wins, total_bets: closed.length, roi: parseFloat(roi), staked, color: COLORS[i % COLORS.length] };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [users, allUsersBets, useRpc]);

  const data = useRpc ? rankings : fallbackRankings;
  const rankClass = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

  return (
    <div className="main">
      <div className="sec-header">
        <div className="sec-title">Classement</div>
      </div>

      <div className="lb">
        {data.map((r, i) => (
          <div key={r.username} className={`lb-card${r.username === user?.name ? ' me' : ''}`}>
            <div className={`lb-rank ${rankClass(i)}`}>{i + 1}</div>
            <div className="lb-av" style={{ background: r.color }}>{ini(r.username)}</div>
            <div className="lb-info">
              <div className="lb-name">
                {r.username}
                {r.is_admin && <span className="admin-badge">Admin</span>}
              </div>
              <div className="lb-sub">{r.total_bets} paris clos</div>
            </div>
            <div className="lb-stats">
              <div className="lb-stat">
                <div className="lb-sv">{r.wins}</div>
                <div className="lb-sl">Wins</div>
              </div>
              <div className="lb-stat">
                <div className="lb-sv">{r.roi}%</div>
                <div className="lb-sl">ROI</div>
              </div>
            </div>
            <div className={`lb-pnl ${r.pnl >= 0 ? 'pos' : 'neg'}`}>{fmt(r.pnl)}</div>
          </div>
        ))}
      </div>

      <div className="info-box">
        <strong>Comment ça marche ?</strong><br />
        Le classement est basé sur le P&L (Profit & Loss) de chaque joueur. Seuls les paris clos (gagnés ou perdus) sont comptés. Le ROI représente le retour sur investissement.
      </div>
    </div>
  );
}
