import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore from '../stores/userStore';

export default function Auth() {
  const navigate = useNavigate();
  const { login, register, loading } = useUserStore();
  const [tab, setTab] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [bankroll, setBankroll] = useState('200');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !pass) { setError('Remplis tous les champs.'); return; }
    const err = await login(email.trim(), pass);
    if (err) setError(err);
    else navigate('/');
  };

  const handleRegister = async () => {
    if (!email.trim() || !name.trim() || !pass) { setError('Remplis tous les champs.'); return; }
    if (pass.length < 6) { setError('Mot de passe trop court (min 6 caractères).'); return; }
    const br = parseFloat(bankroll) || 200;
    const err = await register(email.trim(), pass, name.trim(), br);
    if (err) setError(err);
    else navigate('/');
  };

  const handleSubmit = () => tab === 'login' ? handleLogin() : handleRegister();

  return (
    <div className="onboard-page">
      <div className="onboard-card">
        <div className="logo">Bet<span>Track</span></div>
        <div className="logo-sub">Suivi intelligent de tes paris sportifs</div>

        <div className="tab-toggle">
          <button className={`tab-toggle-btn${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>Connexion</button>
          <button className={`tab-toggle-btn${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>Inscription</button>
        </div>

        <div className="form-field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        {tab === 'register' && (
          <div className="form-field">
            <label>Pseudo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ton pseudo" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
        )}

        <div className="form-field">
          <label>Mot de passe</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        {tab === 'register' && (
          <div className="form-field">
            <label>Bankroll initiale (€)</label>
            <input type="number" value={bankroll} onChange={e => setBankroll(e.target.value)} placeholder="200" />
          </div>
        )}

        {error && <div className="error-msg show">{error}</div>}

        <button className="btn-primary btn-full" onClick={handleSubmit} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'Chargement...' : tab === 'login' ? 'Se connecter →' : "S'inscrire →"}
        </button>

        <div className="form-hint">
          {tab === 'login'
            ? 'Entre ton email et mot de passe pour accéder à tes paris.'
            : 'Crée un compte pour commencer à suivre tes paris.'}
        </div>
      </div>
    </div>
  );
}
