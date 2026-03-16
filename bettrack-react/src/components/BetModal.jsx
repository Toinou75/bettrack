import { useState, useEffect, useCallback } from 'react';
import useUserStore from '../stores/userStore';
import { checkMoneyManagement } from '../utils/betLogic';

export default function BetModal({ open, bet, onClose, onSubmit }) {
  const { user } = useUserStore();
  const isEdit = !!bet;

  const [betType, setBetType] = useState('simple');
  const [match, setMatch] = useState('');
  const [sport, setSport] = useState('Football');
  const [bookmaker, setBookmaker] = useState('Betclic');
  const [stake, setStake] = useState('');
  const [odds, setOdds] = useState('');
  const [status, setStatus] = useState('pending');
  const [pnl, setPnl] = useState('');
  const [isFreebet, setIsFreebet] = useState(false);
  const [closingOdds, setClosingOdds] = useState('');
  const [legs, setLegs] = useState([{ match: '', odds: '' }]);
  const [dirty, setDirty] = useState(false);

  // Populate on edit
  useEffect(() => {
    if (bet) {
      const parsedLegs = bet.legs ? JSON.parse(bet.legs) : null;
      setBetType(parsedLegs ? 'combi' : 'simple');
      setMatch(bet.match || '');
      setSport(bet.sport || 'Football');
      setBookmaker(bet.bookmaker || 'Betclic');
      setStake(bet.stake?.toString() || '');
      setOdds(bet.odds?.toString() || '');
      setStatus(bet.status || 'pending');
      setPnl(bet.pnl?.toString() || '0');
      setIsFreebet(!!bet.is_freebet);
      setClosingOdds(bet.closing_odds?.toString() || '');
      setLegs(parsedLegs || [{ match: '', odds: '' }]);
    } else {
      setBetType('simple'); setMatch(''); setSport('Football'); setBookmaker('Betclic');
      setStake(''); setOdds(''); setStatus('pending'); setPnl(''); setIsFreebet(false);
      setClosingOdds(''); setLegs([{ match: '', odds: '' }]);
    }
    setDirty(false);
  }, [bet, open]);

  const markDirty = useCallback(() => setDirty(true), []);

  const handleClose = () => {
    if (dirty && !window.confirm('Modifications non sauvegardées. Fermer quand même ?')) return;
    onClose();
  };

  const handleSubmit = () => {
    const stakeNum = parseFloat(stake);
    if (isNaN(stakeNum) || stakeNum < 0) return;

    let finalMatch = match, finalLegs = null, finalOdds = null;
    if (betType === 'combi') {
      const validLegs = legs.filter(l => l.match.trim());
      if (!validLegs.length) return;
      finalMatch = validLegs.map(l => l.match).join(' + ');
      finalLegs = JSON.stringify(validLegs.map(l => ({ match: l.match.trim(), odds: parseFloat(l.odds) || null })));
      const manual = parseFloat(odds);
      finalOdds = (!isNaN(manual) && manual > 1) ? manual : validLegs.reduce((a, l) => a * (parseFloat(l.odds) || 1), 1);
    } else {
      if (!match.trim()) return;
      finalOdds = parseFloat(odds) || null;
    }

    let finalPnl = 0;
    if (status === 'win') finalPnl = parseFloat(pnl) || 0;
    else if (status === 'loss') finalPnl = isFreebet ? 0 : -stakeNum;
    if (isFreebet && finalPnl < 0) finalPnl = 0;

    onSubmit({
      user_name: user.name,
      match: finalMatch,
      sport,
      bookmaker,
      stake: stakeNum,
      odds: finalOdds,
      pnl: finalPnl,
      status,
      legs: finalLegs,
      is_freebet: isFreebet,
      closing_odds: parseFloat(closingOdds) || null,
    });
  };

  const combiOdds = legs.reduce((a, l) => a * (parseFloat(l.odds) || 1), 1);

  // Auto-calculate pnl when status is win
  useEffect(() => {
    if (status !== 'win') return;
    const s = parseFloat(stake);
    const o = betType === 'combi' ? (parseFloat(odds) || combiOdds) : parseFloat(odds);
    if (s > 0 && o > 1) {
      setPnl(((o - 1) * s).toFixed(2));
    }
  }, [status, stake, odds, legs, betType, combiOdds]);

  const mmCheck = checkMoneyManagement(parseFloat(stake), user?.bankroll || 0);

  const addLeg = () => { setLegs([...legs, { match: '', odds: '' }]); markDirty(); };
  const removeLeg = idx => { setLegs(legs.filter((_, i) => i !== idx)); markDirty(); };
  const updateLeg = (idx, field, val) => { const n = [...legs]; n[idx] = { ...n[idx], [field]: val }; setLegs(n); markDirty(); };

  if (!open) return null;

  return (
    <div className="overlay open" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{isEdit ? 'Modifier le pari' : 'Nouveau pari'}</div>

        {/* Type toggle */}
        <div className="type-toggle">
          <button className={`type-btn${betType === 'simple' ? ' active' : ''}`} onClick={() => { setBetType('simple'); markDirty(); }}>Simple</button>
          <button className={`type-btn${betType === 'combi' ? ' active' : ''}`} onClick={() => { setBetType('combi'); markDirty(); }}>Combiné</button>
        </div>

        <div className="form2">
          {/* Match / legs */}
          {betType === 'simple' ? (
            <div className="full form-field">
              <label>Match</label>
              <input type="text" value={match} onChange={e => { setMatch(e.target.value); markDirty(); }} placeholder="Ex: PSG vs OM" />
            </div>
          ) : (
            <div className="full form-field">
              <div className="legs-section">
                <div className="legs-title">Sélections</div>
                {legs.map((l, i) => (
                  <div key={i} className="leg-row">
                    <input type="text" value={l.match} onChange={e => updateLeg(i, 'match', e.target.value)} placeholder="Match" />
                    <input type="number" className="leg-odds" value={l.odds} onChange={e => updateLeg(i, 'odds', e.target.value)} placeholder="Cote" step="0.01" />
                    {legs.length > 1 && <button className="btn-sm btn-danger" onClick={() => removeLeg(i)}>✕</button>}
                  </div>
                ))}
                <button className="add-leg-btn" onClick={addLeg}>+ Ajouter une sélection</button>
                <div className="combined-odds-display">Cote combinée : <span>{combiOdds.toFixed(2)}</span></div>
              </div>
            </div>
          )}

          <div className="form-field">
            <label>Sport</label>
            <select value={sport} onChange={e => { setSport(e.target.value); markDirty(); }}>
              {['Football', 'Tennis', 'Basket', 'Rugby', 'Hockey', 'MMA', 'Boxe', 'eSport', 'Autre'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label>Bookmaker</label>
            <select value={bookmaker} onChange={e => { setBookmaker(e.target.value); markDirty(); }}>
              {['Betclic', 'Winamax', 'Unibet', 'ParionsSport', 'PMU', 'Bwin', 'Betway', 'Pokerstars', '1xBet', 'Pinnacle', 'Autre'].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label>Mise (€)</label>
            <input type="number" value={stake} onChange={e => { setStake(e.target.value); markDirty(); }} placeholder="10" step="0.01" />
          </div>

          {betType === 'simple' && (
            <div className="form-field">
              <label>Cote</label>
              <input type="number" value={odds} onChange={e => { setOdds(e.target.value); markDirty(); }} placeholder="1.85" step="0.01" />
            </div>
          )}
          {betType === 'combi' && (
            <div className="form-field">
              <label>Cote manuelle (optionnel)</label>
              <input type="number" value={odds} onChange={e => { setOdds(e.target.value); markDirty(); }} placeholder={combiOdds.toFixed(2)} step="0.01" />
            </div>
          )}

          <div className="form-field">
            <label>Statut</label>
            <select value={status} onChange={e => { setStatus(e.target.value); markDirty(); }}>
              <option value="pending">En cours</option>
              <option value="win">Gagné</option>
              <option value="loss">Perdu</option>
            </select>
          </div>

          {status === 'win' && (
            <div className="form-field">
              <label>Bénéfice (€)</label>
              <input type="number" value={pnl} onChange={e => { setPnl(e.target.value); markDirty(); }} placeholder="8.50" step="0.01" />
            </div>
          )}

          {status === 'pending' && (() => {
            const s = parseFloat(stake);
            const o = betType === 'combi' ? (parseFloat(odds) || combiOdds) : parseFloat(odds);
            return (s > 0 && o > 1) ? (
              <div className="form-field">
                <label>Gain potentiel (€)</label>
                <input type="text" value={`+${((o - 1) * s).toFixed(2)} €`} readOnly style={{ color: 'var(--green)', opacity: 0.8 }} />
              </div>
            ) : null;
          })()}

          <div className="form-field">
            <label>Cote clôture (CLV)</label>
            <input type="number" value={closingOdds} onChange={e => { setClosingOdds(e.target.value); markDirty(); }} placeholder="1.80" step="0.01" />
          </div>

          {/* Freebet toggle */}
          <div className="full form-field">
            <div className={`freebet-row${isFreebet ? ' active' : ''}`} onClick={() => { setIsFreebet(!isFreebet); markDirty(); }}>
              <div className={`toggle-track${isFreebet ? ' on' : ''}`}><div className="toggle-thumb" /></div>
              <div className="freebet-text"><strong>Freebet</strong> — la mise n'est pas déduite de ta bankroll</div>
            </div>
          </div>
        </div>

        {/* Money management */}
        {mmCheck && (
          <div className={`mm-alert ${mmCheck.level === 'ok' ? 'ok' : 'warn'}`} style={{ display: 'block' }}>
            {mmCheck.msg}
          </div>
        )}

        <div className="modal-actions">
          <button onClick={handleClose}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit}>{isEdit ? 'Modifier' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );
}
