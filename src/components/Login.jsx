import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PORTAL_LABELS = {
  client: 'Client',
  vendor: 'Vendor',
  coordinator: 'Coordinator',
  admin: 'Administrator',
};

const ROLE_DASHBOARDS = {
  CLIENT: '/client/dashboard',
  VENDOR: '/vendor/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  ADMIN: '/admin/dashboard',
};

const SIGNUP_ALLOWED = ['client', 'vendor', undefined];

export default function Login() {
  const { portal } = useParams();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const portalKey = portal?.toLowerCase();
  const portalLabel = PORTAL_LABELS[portalKey];
  const signupAllowed = portalKey ? SIGNUP_ALLOWED.includes(portalKey) : true;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const afterAuth = (data) => {
    navigate(ROLE_DASHBOARDS[data?.role] || '/', { replace: true });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await login(form.username, form.password);
      afterAuth(data);
    } catch (err) {
      let errorMsg = 'Login failed. Check your credentials.';
      if (err.response?.data?.message) errorMsg = err.response.data.message;
      else if (typeof err.response?.data === 'string') errorMsg = err.response.data;
      else if (err.message) errorMsg = err.message;
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      setError('Registration is handled by the backend, not available in UI yet.');
    } catch (err) {
      setError('Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-700">
          ← All portals
        </Link>
        <h2 className="text-2xl font-bold text-center text-gray-800 mt-4">
          AICC Event Management
        </h2>
        <p className="text-center text-sm text-gray-500 mt-1 mb-6">
          {mode === 'signin'
            ? portalLabel
              ? `Sign in to the ${portalLabel} Portal`
              : 'Sign in to your portal'
            : portalLabel
              ? `Create your ${portalLabel} Portal account`
              : 'Create a client account'}
        </p>

        {mode === 'signin' ? (
          <form onSubmit={handleSignIn}>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                name="username"
                className={inputClass}
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                className={inputClass}
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Demo accounts: client1, coordinator1, vendor1, admin / password: password123
            </p>

            {signupAllowed && (
              <p className="text-center text-sm text-gray-500 mt-4">
                New client?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Create an account
                </button>
              </p>
            )}
            {portalLabel === 'Vendor' && (
              <p className="text-center text-xs text-gray-400 mt-4">
                Vendor accounts are created by AICC administration.
              </p>
            )}
            {portalLabel === 'Coordinator' && (
              <p className="text-center text-xs text-gray-400 mt-4">
                Coordinator accounts are created by AICC administration.
              </p>
            )}
            {portalLabel === 'Administrator' && (
              <p className="text-center text-xs text-gray-400 mt-4">
                Admin accounts are restricted.
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                name="fullName"
                className={inputClass}
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                name="username"
                className={inputClass}
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                className={inputClass}
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                className={inputClass}
                value={form.password}
                onChange={handleChange}
                required
                minLength="6"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); }}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}