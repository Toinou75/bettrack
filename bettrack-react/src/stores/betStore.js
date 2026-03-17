import { create } from 'zustand';
import { selectUserBets, selectAllBets, selectUserBetsPaginated, insertBet, updateBet, deleteBet } from '../services/supabase';
import { betEffect } from '../utils/betLogic';

const useBetStore = create((set, get) => ({
  bets: [],             // All user bets (for stats/chart/insights)
  allUsersBets: [],     // All users' bets (leaderboard fallback)
  loading: false,

  // Paginated table state
  tableBets: [],
  tableTotalCount: 0,
  tableLoading: false,
  tableParams: { page: 1, pageSize: 20, status: 'all', search: '', dateFrom: '', dateTo: '', sortCol: null, sortDir: 'desc' },

  /* ── Fetch (full — for stats/chart/insights) ── */
  async fetchBets(username) {
    set({ loading: true });
    const data = await selectUserBets(username);
    set({ bets: data, loading: false });
    return data;
  },

  async fetchAllBets() {
    const data = await selectAllBets();
    set({ allUsersBets: data });
    return data;
  },

  /* ── Fetch (paginated — for BetTable) ───────── */
  async fetchTableBets(username, params) {
    const p = params || get().tableParams;
    set({ tableLoading: true });
    const { data, count } = await selectUserBetsPaginated(username, p);
    set({ tableBets: data, tableTotalCount: count, tableLoading: false });
  },

  setTableParams(params) {
    set({ tableParams: { ...get().tableParams, ...params } });
  },

  /* ── Add bet ─────────────────────────────────── */
  async addBet(row, adjustBankroll) {
    set({ loading: true });
    const saved = await insertBet(row);
    if (saved) {
      const effect = betEffect(row.status, row.pnl, row.stake, row.is_freebet);
      await adjustBankroll(effect);
    }
    // Refresh both full bets (for stats) and table bets (for paginated view)
    const data = await selectUserBets(row.user_name);
    set({ bets: data, loading: false });
    await get().fetchTableBets(row.user_name);
    return saved;
  },

  /* ── Edit bet ────────────────────────────────── */
  async editBet(id, row, oldBet, adjustBankroll) {
    set({ loading: true });
    await updateBet(id, row);
    const oldEffect = betEffect(oldBet.status, parseFloat(oldBet.pnl || 0), parseFloat(oldBet.stake || 0), !!oldBet.is_freebet);
    const newEffect = betEffect(row.status, row.pnl, row.stake, row.is_freebet);
    await adjustBankroll(newEffect - oldEffect);
    const data = await selectUserBets(row.user_name);
    set({ bets: data, loading: false });
    await get().fetchTableBets(row.user_name);
  },

  /* ── Delete bet ──────────────────────────────── */
  async removeBet(id, username, adjustBankroll) {
    const bet = get().bets.find(b => b.id === id);
    if (bet) {
      const effect = betEffect(bet.status, parseFloat(bet.pnl || 0), parseFloat(bet.stake || 0), !!bet.is_freebet);
      await adjustBankroll(-effect);
    }
    set({ loading: true });
    await deleteBet(id);
    const data = await selectUserBets(username);
    set({ bets: data, loading: false });
    await get().fetchTableBets(username);
  },
}));

export default useBetStore;
