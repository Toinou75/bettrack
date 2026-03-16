import { useState } from 'react';
import useUserStore from '../stores/userStore';
import { fmt } from '../utils/format';

export default function BankrollBar({ stats }) {
  const { user, setBankroll } = useUserStore();
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  if (!user) return null;

  const bankroll = user.bankroll;
  // Initial bankroll = current + pending stakes - pnl
  const initial = bankroll + (stats?.pendingStaked || 0) - (stats?.pnl || 0);
  const delta = bankroll - initial;
  const pct = initial > 0 ? Math.min(Math.max((bankroll / initial) * 100, 0), 200) : 100;
  const barColor = delta >= 0 ? 'var(--green)' : 'var(--red)';

  const handleSave = () => {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v >= 0) { setBankroll(v); setEditing(false); }
  };

  return (
    <div className="bankroll-bar">
      <div className="br-info">
        <div className="br-sublabel">Bankroll</div>
        <div className="br-row">
          <div className="br-amount">{bankroll.toFixed(2)} €</div>
          <button className="btn-sm btn-edit" onClick={() => { setEditing(!editing); setEditVal(bankroll.toString()); }}>
            {editing ? 'Annuler' : '✏️'}
          </button>
        </div>
        <div className={`br-delta ${delta >= 0 ? 'pos' : 'neg'}`}>{fmt(delta)} depuis le début</div>
        {editing && (
          <div className="br-edit-row show">
            <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} />
            <button className="btn-sm btn-primary" onClick={handleSave}>OK</button>
          </div>
        )}
      </div>
      <div className="prog-wrap">
        <div className="prog-labels">
          <span>Départ : {initial.toFixed(2)} €</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
        <div className="prog-track">
          <div className="prog-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
        </div>
      </div>
    </div>
  );
}
