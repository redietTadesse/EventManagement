import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RootRedirect() {
  const { user, loading } = useAuth();

  // Wait for AuthProvider to finish hydrating the session before redirecting,
  // otherwise a valid token would briefly bounce the user back to /login.
  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'CLIENT': return <Navigate to="/client/dashboard" replace />;
    case 'COORDINATOR': return <Navigate to="/coordinator/dashboard" replace />;
    case 'VENDOR': return <Navigate to="/vendor/dashboard" replace />;
    default: return <Navigate to="/login" replace />;
  }
}