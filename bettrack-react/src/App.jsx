import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import useUserStore from './stores/userStore';
import Nav from './components/Nav';
import BottomNav from './components/BottomNav';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

function RequireAuth({ children }) {
  const { user } = useUserStore();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppLayout() {
  const { user, restoreSession } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const restored = restoreSession();
    if (!restored && location.pathname !== '/auth') navigate('/auth');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAuth = location.pathname === '/auth';

  return (
    <>
      {!isAuth && user && <Nav />}
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAuth && user && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
