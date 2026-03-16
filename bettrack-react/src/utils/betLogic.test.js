import { describe, it, expect } from 'vitest';
import { betEffect, computeStats, computeInsights, checkMoneyManagement } from './betLogic';

/* ── betEffect ─────────────────────────────────────── */
describe('betEffect', () => {
  it('pending normal bet deducts stake', () => {
    expect(betEffect('pending', 0, 10, false)).toBe(-10);
  });

  it('pending freebet does not deduct', () => {
    expect(betEffect('pending', 0, 10, true)).toBe(0);
  });

  it('win normal bet returns stake + pnl', () => {
    expect(betEffect('win', 8.5, 10, false)).toBe(18.5);
  });

  it('win freebet returns only pnl', () => {
    expect(betEffect('win', 8.5, 10, true)).toBe(8.5);
  });

  it('loss returns 0 (stake already deducted)', () => {
    expect(betEffect('loss', -10, 10, false)).toBe(0);
  });

  it('loss freebet returns 0', () => {
    expect(betEffect('loss', 0, 10, true)).toBe(0);
  });

  it('unknown status returns 0', () => {
    expect(betEffect('cancelled', 0, 10, false)).toBe(0);
  });
});

/* ── computeStats ──────────────────────────────────── */
describe('computeStats', () => {
  const bets = [
    { status: 'win', pnl: 10, stake: 20, bookmaker: 'Betclic', sport: 'Football', is_freebet: false, odds: 1.5, closing_odds: 1.45 },
    { status: 'loss', pnl: -15, stake: 15, bookmaker: 'Betclic', sport: 'Tennis', is_freebet: false, odds: 2.0, closing_odds: 2.1 },
    { status: 'pending', pnl: 0, stake: 10, bookmaker: 'Winamax', sport: 'Football', is_freebet: false, odds: 1.8, closing_odds: null },
    { status: 'win', pnl: 5, stake: 10, bookmaker: 'Winamax', sport: 'Basket', is_freebet: true, odds: 1.5, closing_odds: 1.4 },
  ];

  it('counts wins and losses', () => {
    const s = computeStats(bets);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
  });

  it('calculates total bets', () => {
    expect(computeStats(bets).total).toBe(4);
  });

  it('sums pnl from closed bets only', () => {
    const s = computeStats(bets);
    expect(s.pnl).toBe(10 + -15 + 5); // 0
  });

  it('sums staked excluding freebets', () => {
    const s = computeStats(bets);
    expect(s.staked).toBe(20 + 15 + 10); // freebet excluded
  });

  it('calculates pending staked', () => {
    expect(computeStats(bets).pendingStaked).toBe(10);
  });

  it('counts freebets and freebet gains', () => {
    const s = computeStats(bets);
    expect(s.fbCount).toBe(1);
    expect(s.fbGain).toBe(5);
  });

  it('builds byBook breakdown', () => {
    const s = computeStats(bets);
    expect(Object.keys(s.byBook)).toContain('Betclic');
    expect(s.byBook.Betclic.wins).toBe(1);
    expect(s.byBook.Betclic.losses).toBe(1);
  });

  it('builds bySport breakdown', () => {
    const s = computeStats(bets);
    expect(s.bySport.Football.wins).toBe(1);
    expect(s.bySport.Tennis.losses).toBe(1);
  });

  it('calculates CLV average', () => {
    const s = computeStats(bets);
    expect(s.clvCount).toBe(3); // 3 bets have both odds and closing_odds
    expect(s.avgCLV).toBeCloseTo(((1.5/1.45 - 1) + (2.0/2.1 - 1) + (1.5/1.4 - 1)) / 3 * 100, 1);
  });

  it('handles empty bets', () => {
    const s = computeStats([]);
    expect(s.wins).toBe(0);
    expect(s.pnl).toBe(0);
    expect(s.rate).toBeNull();
    expect(s.roi).toBeNull();
  });
});

/* ── computeInsights ───────────────────────────────── */
describe('computeInsights', () => {
  const fmtD = iso => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';

  it('returns null for empty bets', () => {
    expect(computeInsights([], fmtD)).toBeNull();
  });

  it('detects win streak', () => {
    const bets = [
      { status: 'win', pnl: 5, created_at: '2024-01-01' },
      { status: 'win', pnl: 3, created_at: '2024-01-02' },
      { status: 'win', pnl: 7, created_at: '2024-01-03' },
    ];
    const ins = computeInsights(bets, fmtD);
    expect(ins.streak).toBe(3);
    expect(ins.streakType).toBe('win');
  });

  it('detects loss streak after wins', () => {
    const bets = [
      { status: 'win', pnl: 5, created_at: '2024-01-01' },
      { status: 'loss', pnl: -10, created_at: '2024-01-02' },
      { status: 'loss', pnl: -8, created_at: '2024-01-03' },
    ];
    const ins = computeInsights(bets, fmtD);
    expect(ins.streak).toBe(2);
    expect(ins.streakType).toBe('loss');
  });

  it('ignores pending bets', () => {
    const bets = [
      { status: 'win', pnl: 5, created_at: '2024-01-01' },
      { status: 'pending', pnl: 0, created_at: '2024-01-02' },
    ];
    const ins = computeInsights(bets, fmtD);
    expect(ins.streak).toBe(1);
    expect(ins.streakType).toBe('win');
  });
});

/* ── checkMoneyManagement ──────────────────────────── */
describe('checkMoneyManagement', () => {
  it('returns null for invalid inputs', () => {
    expect(checkMoneyManagement(0, 100)).toBeNull();
    expect(checkMoneyManagement(10, 0)).toBeNull();
    expect(checkMoneyManagement(NaN, 100)).toBeNull();
  });

  it('ok for reasonable stake', () => {
    const r = checkMoneyManagement(3, 100);
    expect(r.level).toBe('ok');
  });

  it('warn for 5-10%', () => {
    const r = checkMoneyManagement(7, 100);
    expect(r.level).toBe('warn');
  });

  it('danger for >10%', () => {
    const r = checkMoneyManagement(15, 100);
    expect(r.level).toBe('danger');
  });
});
