import { createClient } from '@supabase/supabase-js';
import { toast } from '../components/Toast';

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.error('[BetTrack] Variables d\'environnement manquantes. VITE_SUPABASE_URL:', !!SUPA_URL, 'VITE_SUPABASE_ANON_KEY:', !!SUPA_KEY);
}

export const supabase = createClient(SUPA_URL || 'https://placeholder.supabase.co', SUPA_KEY || 'placeholder');

function handleError(error, context) {
  if (error) {
    console.error(`[Supabase] ${context}:`, error.message);
    toast.error(`Erreur : ${context}`);
  }
}

// Colonnes optionnelles (fallback si pas encore migrées)
const OPT_COLS = ['is_freebet', 'closing_odds'];
function stripOptCols(row, errMsg) {
  const clean = { ...row };
  OPT_COLS.forEach(c => { if (errMsg.includes(c)) delete clean[c]; });
  return clean;
}

/* ══════════════════════════════════════════════════
   PROFILES (liées à Supabase Auth)
   ══════════════════════════════════════════════════ */

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function getProfileByUsername(username) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  return data;
}

export async function updateProfile(userId, fields) {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  handleError(error, 'Mise à jour du profil');
}

export async function getAllProfiles() {
  const { data } = await supabase.from('profiles').select('username,bankroll,is_admin,id');
  return data || [];
}

export async function updateUserBets(oldName, newName) {
  await supabase.from('paris').update({ user_name: newName }).eq('user_name', oldName);
}

/* ══════════════════════════════════════════════════
   PARIS — lecture
   ══════════════════════════════════════════════════ */

export async function selectUserBets(username) {
  const { data, error } = await supabase
    .from('paris')
    .select('*')
    .eq('user_name', username)
    .order('created_at', { ascending: false });
  handleError(error, 'Chargement des paris');
  return data || [];
}

export async function selectAllBets() {
  const { data, error } = await supabase
    .from('paris')
    .select('*')
    .order('created_at', { ascending: false });
  handleError(error, 'Chargement du classement');
  return data || [];
}

/** Pagination serveur pour BetTable */
export async function selectUserBetsPaginated(username, { page = 1, pageSize = 20, status, search, dateFrom, dateTo, sortCol, sortDir = 'desc' } = {}) {
  let query = supabase
    .from('paris')
    .select('*', { count: 'exact' })
    .eq('user_name', username);

  if (status && status !== 'all') query = query.eq('status', status);
  if (search) {
    query = query.or(`match.ilike.%${search}%,sport.ilike.%${search}%,bookmaker.ilike.%${search}%`);
  }
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

  if (sortCol) {
    query = query.order(sortCol, { ascending: sortDir === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  handleError(error, 'Chargement des paris');
  return { data: data || [], count: count || 0 };
}

/* ══════════════════════════════════════════════════
   PARIS — CRUD
   ══════════════════════════════════════════════════ */

export async function insertBet(row) {
  const { data, error } = await supabase.from('paris').insert(row).select();
  if (error && error.code === '42703') {
    const clean = stripOptCols(row, error.message);
    const { data: d2, error: e2 } = await supabase.from('paris').insert(clean).select();
    handleError(e2, 'Ajout du pari');
    return d2?.[0] || null;
  }
  handleError(error, 'Ajout du pari');
  return data?.[0] || null;
}

export async function updateBet(id, row) {
  const { data, error } = await supabase.from('paris').update(row).eq('id', id).select();
  if (error && error.code === '42703') {
    const clean = stripOptCols(row, error.message);
    const { data: d2, error: e2 } = await supabase.from('paris').update(clean).eq('id', id).select();
    handleError(e2, 'Modification du pari');
    return d2?.[0] || null;
  }
  handleError(error, 'Modification du pari');
  return data?.[0] || null;
}

export async function deleteBet(id) {
  const { error } = await supabase.from('paris').delete().eq('id', id);
  handleError(error, 'Suppression du pari');
}

/* ══════════════════════════════════════════════════
   LEADERBOARD (RPC serveur)
   ══════════════════════════════════════════════════ */

export async function getLeaderboard() {
  const { data, error } = await supabase.rpc('get_leaderboard');
  if (error) {
    // Fallback: si la RPC n'existe pas encore, on retourne []
    console.warn('[Supabase] get_leaderboard RPC not available, falling back');
    return null; // signal pour le composant d'utiliser le fallback
  }
  return data || [];
}
