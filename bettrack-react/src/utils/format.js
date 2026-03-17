export const fmt  = n => (n >= 0 ? '+' : '') + n.toFixed(2) + ' €';
export const fmtD = iso => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';
export const ini  = n => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
