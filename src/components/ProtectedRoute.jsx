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
  // 1. If there is no user, we are either:
  //    a) refreshing the page and checking the token (loading = true) -> show Loading
  //    b) definitely not logged in (loading = false) -> redirect to login
  if (!currentUser) {
    if (loading) {
      return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }
    return <Navigate to="/login" replace />;
  }

  // 2. If the user is logged in, but has the wrong role, redirect to home
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  // 3. Otherwise, let them in! (We ignore `loading` here so background fetching doesn't unmount the page)
  return children;
}