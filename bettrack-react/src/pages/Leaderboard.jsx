import { useEffect, useMemo } from 'react';
import useBetStore from '../stores/betStore';
import useUserStore from '../stores/userStore';
import { getAllUsers } from '../services/supabase';
import { useState } from 'react';
import { fmt, ini } from '../utils/format';

const COLORS = ['#7c6bff', '#00e699', '#ff4d6a', '#ffb84d', '#38bdf8', '#e879f9', '#f97316'];

export default function Leaderboard() {
  const { user } = useUserStore();
  const { allUsersBets, fetchAllBets } = useBetStore();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchAllBets();
    getAllUsers().then(setUsers);
  }, [fetchAllBets]);

  const rankings = useMemo(() => {
    return users.map((u, i) => {
      const userBets = allUsersBets.filter(b => b.user_name === u.username);
      const closed = userBets.filter(b => b.status !== 'pending');
      const wins = closed.filter(b => b.status === 'win').length;
      const pnl = closed.reduce((a, b) => a + b.pnl, 0);
      const staked = userBets.filter(b => !b.is_freebet).reduce((a, b) => a + b.stake, 0);
      const roi = staked > 0 ? ((pnl / staked) * 100).toFixed(1) : '0.0';
      return { ...u, pnl, wins, total: closed.length, roi, color: COLORS[i % COLORS.length] };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [users, allUsersBets]);

  const rankClass = i => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';

  return (
    <div className="main">
      <div className="sec-header">
        <div className="sec-title">Classement</div>
      </div>

      <div className="lb">
        {rankings.map((r, i) => (
          <div key={r.username} className={`lb-card${r.username === user?.name ? ' me' : ''}`}>
            <div className={`lb-rank ${rankClass(i)}`}>{i + 1}</div>
            <div className="lb-av" style={{ background: r.color }}>{ini(r.username)}</div>
            <div className="lb-info">
              <div className="lb-name">
                {r.username}
                {r.is_admin && <span className="admin-badge">Admin</span>}
              </div>
              <div className="lb-sub">{r.total} paris clos</div>
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
