import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="text-center py-10">Loading...</div>;

  // If not logged in at all, kick them to the portal select page
  if (!user) return <Navigate to="/" replace />;

  // If logged in but wrong role (e.g., a Client trying to view Admin), kick them out
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // THIS IS THE FIX: Render the nested route
  return <Outlet />;
}