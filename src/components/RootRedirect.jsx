import { Navigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';

export default function RootRedirect() {
  const { state } = useApp();
  const { currentUser, loading } = state;

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (!currentUser) return <Navigate to="/" replace />;
  switch (currentUser.role) {
    case 'CLIENT': return <Navigate to="/client/dashboard" replace />;
    case 'COORDINATOR': return <Navigate to="/coordinator/dashboard" replace />;
    case 'VENDOR': return <Navigate to="/vendor/dashboard" replace />;
    default: return <Navigate to="/login" replace />;
  }
}