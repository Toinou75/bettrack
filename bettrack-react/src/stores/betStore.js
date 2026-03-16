import { create } from 'zustand';
import { selectUserBets, selectAllBets, insertBet, updateBet, deleteBet } from '../services/supabase';
import { betEffect } from '../utils/betLogic';

const useBetStore = create((set, get) => ({
  bets: [],
  allUsersBets: [],   // for leaderboard
  loading: false,

  /* ── Fetch ───────────────────────────────────── */
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

  /* ── Add bet ─────────────────────────────────── */
  async addBet(row, adjustBankroll) {
    set({ loading: true });
    const saved = await insertBet(row);
    if (saved) {
      const effect = betEffect(row.status, row.pnl, row.stake, row.is_freebet);
      await adjustBankroll(effect);
    }
    const data = await selectUserBets(row.user_name);
    set({ bets: data, loading: false });
    return saved;
  },

  /* ── Edit bet ────────────────────────────────── */
  async editBet(id, row, oldBet, adjustBankroll) {
    set({ loading: true });
    await updateBet(id, row);
    // Reverse old effect, apply new
    const oldEffect = betEffect(oldBet.status, parseFloat(oldBet.pnl || 0), parseFloat(oldBet.stake || 0), !!oldBet.is_freebet);
    const newEffect = betEffect(row.status, row.pnl, row.stake, row.is_freebet);
    await adjustBankroll(newEffect - oldEffect);
    const data = await selectUserBets(row.user_name);
    set({ bets: data, loading: false });
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
  },
}));

export default useBetStore;
