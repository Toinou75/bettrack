import { useState, useEffect, useRef, useCallback } from 'react';
import { fmtD, fmt } from '../utils/format';
import { exportCSV } from '../utils/betLogic';
import useBetStore from '../stores/betStore';
import useUserStore from '../stores/userStore';

const PAGE_SIZE = 20;

const statusLabel = s => s === 'win' ? 'Gagné' : s === 'loss' ? 'Perdu' : 'En cours';
const statusBadge = s => s === 'win' ? 'bw' : s === 'loss' ? 'bl' : 'bp';

export default function BetTable({ bets, onEdit, onDelete, onAdd }) {
  const { user } = useUserStore();
  const { tableBets, tableTotalCount, tableLoading, fetchTableBets, tableParams, setTableParams } = useBetStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const searchTimeout = useRef(null);

  // Sync local state to store params and fetch
  const doFetch = useCallback((overrides = {}) => {
    if (!user?.name) return;
    const params = { page, pageSize: PAGE_SIZE, status: filter, search, dateFrom, dateTo, sortCol, sortDir, ...overrides };
    setTableParams(params);
    fetchTableBets(user.name, params);
  }, [user?.name, page, filter, search, dateFrom, dateTo, sortCol, sortDir, setTableParams, fetchTableBets]);

  // Fetch on mount and when filters change (except search, which is debounced)
  useEffect(() => {
    doFetch();
  }, [page, filter, dateFrom, dateTo, sortCol, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      doFetch({ search: val, page: 1 });
    }, 300);
  };

  const totalPages = Math.ceil(tableTotalCount / PAGE_SIZE);
  const safePage = Math.min(page, totalPages || 1);

  const handleSort = col => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleFilterChange = f => { setFilter(f); setPage(1); };
  const clearDates = () => { setDateFrom(''); setDateTo(''); setPage(1); };

  // Pagination pages
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - safePage) > 1) {
      if (pages[pages.length - 1] !== '...') pages.push('...');
      continue;
    }
    pages.push(i);
  }

  return (
    <>
      <div className="sec-header">
        <div className="sec-title">Historique des paris</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="export-btn" onClick={() => exportCSV(bets)}>Export CSV</button>
          <button className="btn-primary btn-sm" onClick={onAdd}>+ Nouveau pari</button>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Rechercher…" value={search} onChange={e => handleSearchChange(e.target.value)} />
        </div>
        <div className="filters">
          {['all', 'pending', 'win', 'loss'].map(f => (
            <button key={f} className={`fbtn${filter === f ? ' active' : ''}`} onClick={() => handleFilterChange(f)}>
              {f === 'all' ? 'Tous' : f === 'pending' ? 'En cours' : f === 'win' ? 'Gagnés' : 'Perdus'}
            </button>
          ))}
        </div>
        <div className="date-filter">
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
          {(dateFrom || dateTo) && <button className="fbtn" onClick={clearDates}>✕</button>}
        </div>
      </div>

      <div className="tcard">
        {tableLoading && <div className="loading-bar" />}
        <div className="tscroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Match</th>
                <th className={`sortable${sortCol === 'sport' ? ` sort-${sortDir}` : ''}`} onClick={() => handleSort('sport')}>
                  Sport <span className="sort-icon">↕</span>
                </th>
                <th className={`sortable${sortCol === 'bookmaker' ? ` sort-${sortDir}` : ''}`} onClick={() => handleSort('bookmaker')}>
                  Book <span className="sort-icon">↕</span>
                </th>
                <th>Mise</th>
                <th>Cote</th>
                <th>Statut</th>
                <th>P&L</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tableBets.length === 0 && !tableLoading && (
                <tr><td colSpan={9}>
                  <div className="empty">
                    <div className="empty-ico">📭</div>
                    <div className="empty-t">Aucun pari trouvé</div>
                    <div className="empty-s">Ajoute ton premier pari pour commencer</div>
                  </div>
                </td></tr>
              )}
              {tableBets.map(b => {
                const legs = b.legs ? JSON.parse(b.legs) : null;
                return (
                  <tr key={b.id}>
                    <td>{fmtD(b.created_at)}</td>
                    <td className="td-match">
                      {b.match}
                      {legs && <span className="combo-badge">Combiné</span>}
                      {b.is_freebet && <span className="fb-badge">FREE</span>}
                      {legs && <div className="td-legs">{legs.map(l => l.match).join(' • ')}</div>}
                    </td>
                    <td><span className="sbadge">{b.sport}</span></td>
                    <td><span className="sbadge">{b.bookmaker}</span></td>
                    <td>{b.stake.toFixed(2)} €</td>
                    <td>{b.odds ? parseFloat(b.odds.toFixed(2)) : '—'}</td>
                    <td><span className={`badge ${statusBadge(b.status)}`}>{statusLabel(b.status)}</span></td>
                    <td className={b.pnl >= 0 ? 'pos' : 'neg'}>{fmt(b.pnl)}</td>
                    <td>
                      <button className="btn-sm btn-edit" onClick={() => onEdit(b)}>✏️</button>
                      <button className="btn-sm btn-danger" onClick={() => onDelete(b.id)}>🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="pg-btn" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>&lt;</button>
            {pages.map((p, i) =>
              p === '...'
                ? <span key={`dots-${i}`} className="pg-info">...</span>
                : <button key={p} className={`pg-btn${p === safePage ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            )}
            <button className="pg-btn" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>&gt;</button>
            <span className="pg-info">{tableTotalCount} paris</span>
          </div>
        )}
      </div>
    </>
  );
}
