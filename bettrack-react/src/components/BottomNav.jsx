import { useNavigate, useLocation } from 'react-router-dom';

const items = [
  { path: '/',            ico: '📊', label: 'Dashboard' },
  { path: '/leaderboard', ico: '🏆', label: 'Classement' },
  { path: '/profile',     ico: '👤', label: 'Profil' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {items.map(i => (
          <button
            key={i.path}
            className={`bnav-btn${location.pathname === i.path ? ' active' : ''}`}
            onClick={() => navigate(i.path)}
          >
            <span className="bnav-ico">{i.ico}</span>
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}
