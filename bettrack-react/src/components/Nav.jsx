import { useNavigate, useLocation } from 'react-router-dom';
import useUserStore from '../stores/userStore';
import { ini } from '../utils/format';

const tabs = [
  { path: '/',            label: 'Dashboard' },
  { path: '/leaderboard', label: 'Classement' },
  { path: '/profile',     label: 'Profil' },
];

export default function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUserStore();

  const handleLogout = () => { logout(); navigate('/auth'); };

  return (
    <nav className="nav">
      <div className="nav-logo">Bet<span>Track</span></div>
      <div className="nav-tabs">
        {tabs.map(t => (
          <button
            key={t.path}
            className={`nav-tab${location.pathname === t.path ? ' active' : ''}`}
            onClick={() => navigate(t.path)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="nav-right">
        <button className="btn-sm" onClick={handleLogout}>Déconnexion</button>
        <div className="avatar">{user ? ini(user.name) : '?'}</div>
      </div>
    </nav>
  );
}
