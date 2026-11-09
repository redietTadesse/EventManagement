import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { state } = useApp();
  const { currentUser, loading } = state;
  const { pathname, search } = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to={allowedRoles?.length === 1 ? `/login/${allowedRoles[0].toLowerCase()}` : '/login'}
      state={{ returnTo: pathname + search }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
