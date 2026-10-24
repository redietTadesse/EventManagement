import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLE_DASHBOARDS } from '../utils/roles';

export default function RootRedirect() {
  const { state } = useApp();
  const { currentUser, loading } = state;

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (!currentUser) return <Navigate to="/" replace />;
  return <Navigate to={ROLE_DASHBOARDS[currentUser.role] || '/login'} replace />;
}