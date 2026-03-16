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

export async function selectBets(filter = '') {
  const { data, error } = await supabase
    .from('paris')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  if (filter) return data.filter(filter);
  return data;
}

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

export async function getUser(username) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  return data;
}

export async function createUser(username, passwordHash, bankroll) {
  const { data } = await supabase.from('users').insert({
    username, password_hash: passwordHash, bankroll,
    initial_bankroll: bankroll, is_admin: username === 'Toinou75'
  }).select().single();
  return data;
}

export async function updateUserBankroll(username, bankroll) {
  await supabase.from('users').update({ bankroll }).eq('username', username);
}

export async function updateUser(username, fields) {
  await supabase.from('users').update(fields).eq('username', username);
}

export async function updateUserBets(oldName, newName) {
  await supabase.from('paris').update({ user_name: newName }).eq('user_name', oldName);
}

export async function deleteUser(username) {
  await supabase.from('paris').delete().eq('user_name', username);
  await supabase.from('users').delete().eq('username', username);
}

export async function getAllUsers() {
  const { data } = await supabase.from('users').select('username,bankroll,is_admin');
  return data || [];
}
