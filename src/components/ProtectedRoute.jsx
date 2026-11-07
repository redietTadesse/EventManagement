
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { state } = useApp();
  const { currentUser, loading } = state;

  // Wait for authentication restoration if no user is available yet.
  if (!currentUser && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Redirect unauthenticated users to login.
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Prevent users from accessing routes belonging to another role.
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
