import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore from '../stores/userStore';
import { getAllProfiles } from '../services/supabase';
import { ini } from '../utils/format';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Profile() {
  const navigate = useNavigate();
  const { user, changePassword, changeUsername, resetBankroll, deleteAccount, adminSendResetEmail } = useUserStore();

  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  const [newName, setNewName] = useState('');
  const [nameMsg, setNameMsg] = useState({ type: '', text: '' });

  const [brVal, setBrVal] = useState('');
  const [brMsg, setBrMsg] = useState({ type: '', text: '' });

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Admin state
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminMsg, setAdminMsg] = useState({});

  useEffect(() => {
    if (user?.isAdmin) getAllProfiles().then(setAdminUsers);
  }, [user?.isAdmin]);

  if (!user) return null;

  const handleChangePassword = async () => {
    if (!newPass) { setPassMsg({ type: 'error', text: 'Saisis un nouveau mot de passe.' }); return; }
    if (newPass.length < 6) { setPassMsg({ type: 'error', text: 'Min 6 caractères.' }); return; }
    const err = await changePassword(newPass);
    if (err) setPassMsg({ type: 'error', text: err });
    else { setPassMsg({ type: 'success', text: 'Mot de passe modifié !' }); setNewPass(''); }
  };

  const handleChangeUsername = async () => {
    if (!newName.trim()) { setNameMsg({ type: 'error', text: 'Saisis un pseudo.' }); return; }
    const err = await changeUsername(newName.trim());
    if (err) setNameMsg({ type: 'error', text: err });
    else { setNameMsg({ type: 'success', text: 'Pseudo modifié !' }); setNewName(''); }
  };

  const handleResetBankroll = async () => {
    const v = parseFloat(brVal);
    if (isNaN(v) || v <= 0) { setBrMsg({ type: 'error', text: 'Montant invalide.' }); return; }
    await resetBankroll(v);
    setBrMsg({ type: 'success', text: 'Bankroll réinitialisée !' }); setBrVal('');
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    navigate('/auth');
  };

  const handleAdminSendReset = async (email, username) => {
    const err = await adminSendResetEmail(email);
    if (err) setAdminMsg(m => ({ ...m, [username]: `Erreur : ${err}` }));
    else setAdminMsg(m => ({ ...m, [username]: 'Lien envoyé !' }));
  };

  return (
    <div className="main">
      {/* Header */}
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">{ini(user.name)}</div>
          <div>
            <div className="profile-name">
              {user.name}
              {user.isAdmin && <span className="admin-badge">Admin</span>}
            </div>
            <div className="profile-sub">{user.email}</div>
            <div className="profile-sub">Bankroll actuelle : {user.bankroll.toFixed(2)} €</div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="profile-section">
        <div className="profile-section-title">Modifier le mot de passe</div>
        <div className="profile-form">
          <input type="password" placeholder="Nouveau mot de passe" value={newPass} onChange={e => setNewPass(e.target.value)} />
          <button className="btn-primary btn-sm" onClick={handleChangePassword}>Modifier</button>
        </div>
        {passMsg.text && <div className={`${passMsg.type === 'error' ? 'error-msg' : 'success-msg'} show`}>{passMsg.text}</div>}
      </div>

      {/* Change username */}
      <div className="profile-section">
        <div className="profile-section-title">Modifier le pseudo</div>
        <div className="profile-form">
          <input type="text" placeholder="Nouveau pseudo" value={newName} onChange={e => setNewName(e.target.value)} />
          <button className="btn-primary btn-sm" onClick={handleChangeUsername}>Modifier</button>
        </div>
        {nameMsg.text && <div className={`${nameMsg.type === 'error' ? 'error-msg' : 'success-msg'} show`}>{nameMsg.text}</div>}
      </div>

      {/* Reset bankroll */}
      <div className="profile-section">
        <div className="profile-section-title">Réinitialiser la bankroll</div>
        <div className="profile-form">
          <input type="number" placeholder="Nouveau montant" value={brVal} onChange={e => setBrVal(e.target.value)} />
          <button className="btn-primary btn-sm" onClick={handleResetBankroll}>Réinitialiser</button>
        </div>
        {brMsg.text && <div className={`${brMsg.type === 'error' ? 'error-msg' : 'success-msg'} show`}>{brMsg.text}</div>}
      </div>

      {/* Delete account */}
      <div className="profile-section">
        <div className="profile-section-title">Zone dangereuse</div>
        <button className="btn-danger" onClick={() => setConfirmDelete(true)}>Supprimer mon compte</button>
      </div>

      {/* Admin panel */}
      {user.isAdmin && (
        <div className="admin-panel">
          <div className="admin-title">Panel administrateur</div>
          <div className="admin-users">
            {adminUsers.filter(u => u.username !== user.name).map(u => (
              <div key={u.username} className="admin-user-row">
                <div className="admin-user-name">{u.username}</div>
                <div className="admin-user-stats">Bankroll : {parseFloat(u.bankroll).toFixed(2)} €</div>
                <div className="admin-actions">
                  <button className="btn-sm btn-primary" onClick={() => handleAdminSendReset(null, u.username)}>
                    Envoyer lien de reset
                  </button>
                </div>
                {adminMsg[u.username] && <div className="success-msg show" style={{ width: '100%' }}>{adminMsg[u.username]}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ton compte ?"
        message="Tous tes paris et données seront supprimés définitivement."
        danger
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
