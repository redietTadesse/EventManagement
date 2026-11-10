
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLE_DASHBOARDS } from '../utils/roles';

export default function ProtectedRoute({ allowedRoles }) {
  const { state } = useApp();
  const { currentUser, loading } = state;
  const { pathname, search } = useLocation();

  // Wait for authentication restoration before redirecting.
  if (!currentUser && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Redirect unauthenticated users to the appropriate login portal.
  // Preserve their requested destination for after login.
  if (!currentUser) {
    const loginPath =
      allowedRoles?.length === 1
        ? `/login/${allowedRoles[0].toLowerCase()}`
        : '/login';

    return (
      <Navigate
        to={loginPath}
        state={{ returnTo: pathname + search }}
        replace
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={ROLE_DASHBOARDS[currentUser.role] || '/'} replace />;
  }

  // Authenticated and authorized: render protected content.
  return <Outlet />;
}
