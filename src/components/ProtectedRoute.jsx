import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { state } = useApp();
  const { currentUser, loading } = state;

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