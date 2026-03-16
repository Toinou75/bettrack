import { create } from 'zustand';
import { supabase, getProfile, getProfileByUsername, updateProfile, updateUserBets } from '../services/supabase';

const useUserStore = create((set, get) => ({
  user: null,       // { id, name, email, bankroll, isAdmin }
  loading: false,
  _initialized: false,

  /* ── Init (session restore via Supabase Auth) ── */
  async init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await getProfile(session.user.id);
      if (profile) {
        set({
          user: {
            id: session.user.id,
            name: profile.username,
            email: session.user.email,
            bankroll: parseFloat(profile.bankroll) || 200,
            isAdmin: profile.is_admin || false,
          },
        });
      }
    }
    set({ _initialized: true });

    // Listener pour changements de session (token refresh, sign out, etc.)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Refresh le profil au cas où
        const profile = await getProfile(session.user.id);
        if (profile) {
          set(s => ({
            user: s.user ? {
              ...s.user,
              bankroll: parseFloat(profile.bankroll) || s.user.bankroll,
              isAdmin: profile.is_admin || false,
            } : null,
          }));
        }
      }
    });
  },

  /* ── Login ───────────────────────────────────── */
  async login(email, password) {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { set({ loading: false }); return error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message; }

    const profile = await getProfile(data.user.id);
    set({ loading: false });
    if (!profile) return 'Profil introuvable.';

    set({
      user: {
        id: data.user.id,
        name: profile.username,
        email: data.user.email,
        bankroll: parseFloat(profile.bankroll) || 200,
        isAdmin: profile.is_admin || false,
      },
    });
    return null;
  },

  /* ── Register ────────────────────────────────── */
  async register(email, password, username, bankroll) {
    set({ loading: true });
    const existing = await getProfileByUsername(username);
    if (existing) { set({ loading: false }); return 'Ce pseudo est déjà pris.'; }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, bankroll: bankroll || 200 } },
    });
    set({ loading: false });
    if (error) return error.message;
    if (!data.user) return 'Erreur lors de la création du compte.';

    // Le trigger handle_new_user crée automatiquement le profil
    // Petit délai pour laisser le trigger s'exécuter
    await new Promise(r => setTimeout(r, 500));
    const profile = await getProfile(data.user.id);

    set({
      user: {
        id: data.user.id,
        name: username,
        email: data.user.email || email,
        bankroll: parseFloat(profile?.bankroll) || bankroll || 200,
        isAdmin: profile?.is_admin || false,
      },
    });
    return null;
  },

  /* ── Logout ──────────────────────────────────── */
  async logout() {
    await supabase.auth.signOut();
    set({ user: null });
  },

  /* ── Bankroll ────────────────────────────────── */
  async setBankroll(amount) {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, bankroll: amount } });
    await updateProfile(user.id, { bankroll: amount });
  },

  adjustBankroll(delta) {
    const { user } = get();
    if (!user) return;
    const nb = parseFloat((user.bankroll + delta).toFixed(2));
    return get().setBankroll(nb);
  },

  /* ── Profile updates ─────────────────────────── */
  async changePassword(newPass) {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) return error.message;
    return null;
  },

  async changeUsername(newName) {
    const { user } = get();
    const existing = await getProfileByUsername(newName);
    if (existing) return 'Ce pseudo est déjà pris.';
    await updateProfile(user.id, { username: newName });
    await updateUserBets(user.name, newName);
    await supabase.auth.updateUser({ data: { username: newName } });
    set({ user: { ...user, name: newName } });
    return null;
  },

  async resetBankroll(amount) {
    const { user } = get();
    await updateProfile(user.id, { bankroll: amount, initial_bankroll: amount });
    set({ user: { ...user, bankroll: amount } });
  },

  async deleteAccount() {
    await supabase.rpc('delete_own_account');
    await supabase.auth.signOut();
    set({ user: null });
  },

  /* ── Admin ───────────────────────────────────── */
  async adminSendResetEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return error.message;
    return null;
  },
}));

export default useUserStore;
