import { create } from 'zustand';
import { getUser, createUser, updateUserBankroll, updateUser, updateUserBets, deleteUser } from '../services/supabase';
import { hashPassword, hashPasswordLegacy } from '../utils/hash';

const useUserStore = create((set, get) => ({
  user: null,       // { name, bankroll, isAdmin }
  loading: false,

  /* ── Restore session ─────────────────────────── */
  restoreSession() {
    try {
      const s = JSON.parse(localStorage.getItem('bt_session') || 'null');
      if (s?.name) set({ user: s });
      return !!s;
    } catch { return false; }
  },

  /* ── Login ───────────────────────────────────── */
  async login(username, password) {
    set({ loading: true });
    const dbUser = await getUser(username);
    const hash       = await hashPassword(password);
    const legacyHash = await hashPasswordLegacy(password);
    set({ loading: false });

    if (!dbUser || (dbUser.password_hash !== hash && dbUser.password_hash !== legacyHash)) {
      return 'Pseudo ou mot de passe incorrect.';
    }
    // Migrate legacy → PBKDF2
    if (dbUser.password_hash === legacyHash && dbUser.password_hash !== hash) {
      await updateUser(username, { password_hash: hash });
    }
    const user = { name: dbUser.username, bankroll: parseFloat(dbUser.bankroll) || 200, isAdmin: dbUser.is_admin || false };
    set({ user });
    try { localStorage.setItem('bt_session', JSON.stringify(user)); } catch {}
    return null; // success
  },

  /* ── Register ────────────────────────────────── */
  async register(username, password, bankroll) {
    set({ loading: true });
    const existing = await getUser(username);
    if (existing) { set({ loading: false }); return 'Ce pseudo est déjà pris.'; }
    const hash = await hashPassword(password);
    const dbUser = await createUser(username, hash, bankroll);
    set({ loading: false });
    if (!dbUser) return 'Erreur lors de la création du compte.';
    const user = { name: dbUser.username, bankroll: parseFloat(dbUser.bankroll), isAdmin: dbUser.is_admin || false };
    set({ user });
    try { localStorage.setItem('bt_session', JSON.stringify(user)); } catch {}
    return null;
  },

  /* ── Logout ──────────────────────────────────── */
  logout() {
    set({ user: null });
    try { localStorage.removeItem('bt_session'); } catch {}
  },

  /* ── Bankroll ────────────────────────────────── */
  async setBankroll(amount) {
    const { user } = get();
    if (!user) return;
    const updated = { ...user, bankroll: amount };
    set({ user: updated });
    await updateUserBankroll(user.name, amount);
    try { localStorage.setItem('bt_session', JSON.stringify(updated)); } catch {}
  },

  adjustBankroll(delta) {
    const { user } = get();
    if (!user) return;
    const nb = parseFloat((user.bankroll + delta).toFixed(2));
    return get().setBankroll(nb);
  },

  /* ── Profile updates ─────────────────────────── */
  async changePassword(oldPass, newPass) {
    const { user } = get();
    const dbUser = await getUser(user.name);
    const oldHash    = await hashPassword(oldPass);
    const legacyHash = await hashPasswordLegacy(oldPass);
    if (dbUser.password_hash !== oldHash && dbUser.password_hash !== legacyHash) {
      return 'Ancien mot de passe incorrect.';
    }
    const newHash = await hashPassword(newPass);
    await updateUser(user.name, { password_hash: newHash });
    return null;
  },

  async changeUsername(newName) {
    const { user } = get();
    const existing = await getUser(newName);
    if (existing) return 'Ce pseudo est déjà pris.';
    await updateUser(user.name, { username: newName });
    await updateUserBets(user.name, newName);
    const updated = { ...user, name: newName };
    set({ user: updated });
    try { localStorage.setItem('bt_session', JSON.stringify(updated)); } catch {}
    return null;
  },

  async resetBankroll(amount) {
    const { user } = get();
    await updateUser(user.name, { bankroll: amount, initial_bankroll: amount });
    const updated = { ...user, bankroll: amount };
    set({ user: updated });
    try { localStorage.setItem('bt_session', JSON.stringify(updated)); } catch {}
  },

  async deleteAccount() {
    const { user } = get();
    await deleteUser(user.name);
    set({ user: null });
    try { localStorage.removeItem('bt_session'); } catch {}
  },

  /* ── Admin ───────────────────────────────────── */
  async adminResetPassword(username, newPass) {
    const hash = await hashPassword(newPass);
    await updateUser(username, { password_hash: hash });
  },
}));

export default useUserStore;
