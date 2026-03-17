/* ── Bankroll effect ────────────────────────────────── */
export function betEffect(status, pnl, stake, isFreebet) {
  if (status === 'pending') return isFreebet ? 0 : -stake;
  if (status === 'win')     return isFreebet ? pnl : stake + pnl;
  if (status === 'loss')    return 0;
  return 0;
}

/* ── Stats ──────────────────────────────────────────── */
export function computeStats(bets) {
  const closed = bets.filter(b => b.status !== 'pending');
  const wins   = bets.filter(b => b.status === 'win').length;
  const losses = bets.filter(b => b.status === 'loss').length;
  const pnl    = closed.reduce((a, b) => a + b.pnl, 0);
  const staked = bets.filter(b => !b.is_freebet).reduce((a, b) => a + b.stake, 0);
  const pendingStaked = bets.filter(b => b.status === 'pending' && !b.is_freebet).reduce((a, b) => a + b.stake, 0);

  // Freebets
  const freebets = bets.filter(b => b.is_freebet);
  const fbGain   = freebets.filter(b => b.status === 'win').reduce((a, b) => a + b.pnl, 0);

  // Breakdown par bookmaker
  const byBook = {};
  closed.forEach(b => {
    if (!byBook[b.bookmaker]) byBook[b.bookmaker] = { pnl: 0, wins: 0, losses: 0, staked: 0, count: 0 };
    const bk = byBook[b.bookmaker];
    bk.pnl += b.pnl; bk.count++;
    if (!b.is_freebet) bk.staked += b.stake;
    if (b.status === 'win') bk.wins++; else bk.losses++;
  });

  // Breakdown par sport
  const bySport = {};
  closed.forEach(b => {
    if (!bySport[b.sport]) bySport[b.sport] = { pnl: 0, wins: 0, losses: 0, staked: 0, count: 0 };
    const sp = bySport[b.sport];
    sp.pnl += b.pnl; sp.count++;
    if (!b.is_freebet) sp.staked += b.stake;
    if (b.status === 'win') sp.wins++; else sp.losses++;
  });

  // Breakdown par type de pari
  const byBetType = {};
  closed.forEach(b => {
    const t = b.bet_type || 'Non défini';
    if (!byBetType[t]) byBetType[t] = { pnl: 0, wins: 0, losses: 0, staked: 0, count: 0 };
    const bt = byBetType[t];
    bt.pnl += b.pnl; bt.count++;
    if (!b.is_freebet) bt.staked += b.stake;
    if (b.status === 'win') bt.wins++; else bt.losses++;
  });

  // CLV
  const clvBets = closed.filter(b => b.closing_odds && b.odds);
  const avgCLV  = clvBets.length
    ? clvBets.reduce((a, b) => a + ((b.odds / b.closing_odds) - 1) * 100, 0) / clvBets.length
    : null;

  return {
    wins, losses, pnl, staked, pendingStaked,
    total: bets.length,
    rate: closed.length ? ((wins / closed.length) * 100).toFixed(1) : null,
    roi: staked > 0 ? ((pnl / staked) * 100).toFixed(1) : null,
    fbCount: freebets.length, fbGain,
    byBook, bySport, byBetType, avgCLV, clvCount: clvBets.length,
  };
}

/* ── Insights (streaks, best/worst run) ────────────── */
export function computeInsights(bets, fmtD) {
  const closed = [...bets]
    .filter(b => b.status !== 'pending')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (!closed.length) return null;

  // Current streak
  let streak = 0, streakType = null;
  for (let i = closed.length - 1; i >= 0; i--) {
    const s = closed[i].status;
    if (streakType === null) streakType = s;
    if (s === streakType) streak++;
    else break;
  }

  // Best / worst run of 5
  let bestRun  = { pnl: -Infinity, start: null, end: null };
  let worstRun = { pnl: Infinity,  start: null, end: null };
  if (closed.length >= 3) {
    const win = Math.min(5, closed.length);
    for (let i = 0; i <= closed.length - win; i++) {
      const slice = closed.slice(i, i + win);
      const p = slice.reduce((a, b) => a + b.pnl, 0);
      if (p > bestRun.pnl)  bestRun  = { pnl: p, start: fmtD(slice[0].created_at), end: fmtD(slice[win - 1].created_at) };
      if (p < worstRun.pnl) worstRun = { pnl: p, start: fmtD(slice[0].created_at), end: fmtD(slice[win - 1].created_at) };
    }
  }
  return { streak, streakType, bestRun, worstRun };
}

/* ── Money management check ────────────────────────── */
export function checkMoneyManagement(stake, bankroll) {
  if (isNaN(stake) || stake <= 0 || bankroll <= 0) return null;
  const pct = (stake / bankroll) * 100;
  if (pct > 10)     return { level: 'danger', pct, msg: `⚠ Attention : tu mises ${pct.toFixed(1)}% de ta bankroll. Les pros ne dépassent jamais 5%.` };
  if (pct > 5)      return { level: 'warn',   pct, msg: `⚠ Mise élevée : ${pct.toFixed(1)}% de ta bankroll. Prudence recommandée.` };
  return { level: 'ok', pct, msg: `✅ Mise raisonnable : ${pct.toFixed(1)}% de ta bankroll.` };
}

/* ── CSV export ────────────────────────────────────── */
export function exportCSV(bets) {
  if (!bets.length) return;
  const headers = ['Date', 'Match', 'Sport', 'Type', 'Bookmaker', 'Mise', 'Cote', 'Statut', 'P&L', 'Freebet', 'Cote cloture'];
  const rows = bets.map(b => [
    b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : '',
    '"' + b.match.replace(/"/g, '""') + '"',
    b.sport, b.bet_type || '', b.bookmaker, b.stake, b.odds || '',
    b.status === 'win' ? 'Gagné' : b.status === 'loss' ? 'Perdu' : 'En cours',
    b.pnl, b.is_freebet ? 'Oui' : 'Non', b.closing_odds || '',
  ]);
  const csv = '\ufeff' + [headers, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bettrack_export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
