import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { state } = useApp();
  const { currentUser, loading } = state;

  if (loading) return <div className="text-center py-10">Loading...</div>;

  if (!currentUser) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}