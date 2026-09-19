import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Layout({ children, title }) {
  const { state, logout } = useApp();
  const { currentUser } = state;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold text-indigo-600">
                AICC
              </Link>
              <span className="text-sm text-gray-500">{title}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{currentUser?.name || currentUser?.fullName}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}