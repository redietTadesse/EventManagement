import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ROLE_DASHBOARDS } from '../utils/roles';
import { BuildingOfficeIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const PORTAL_LABELS = {
  client: { label: 'Client', icon: BuildingOfficeIcon, color: 'from-indigo-500 to-indigo-600' },
  vendor: { label: 'Vendor', icon: UserGroupIcon, color: 'from-emerald-500 to-emerald-600' },
  coordinator: { label: 'Coordinator', icon: ClipboardDocumentListIcon, color: 'from-slate-600 to-slate-700' },
  admin: { label: 'Administrator', icon: ShieldCheckIcon, color: 'from-amber-500 to-amber-600' },
};

const SIGNUP_ALLOWED = ['client', undefined];

export default function Login() {
  const { portal } = useParams();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, registerClient } = useApp();
  const navigate = useNavigate();

  const portalKey = portal?.toLowerCase();
  const portalInfo = PORTAL_LABELS[portalKey];
  const portalLabel = portalInfo?.label;
  const signupAllowed = portalKey ? SIGNUP_ALLOWED.includes(portalKey) : true;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const data = await login(form.username, form.password);
      navigate(ROLE_DASHBOARDS[data?.role] || '/', { replace: true });
    } catch (err) {
      let errorMsg = 'Login failed. Check your credentials.';
      if (err.response?.data?.message) errorMsg = err.response.data.message;
      else if (typeof err.response?.data === 'string') errorMsg = err.response.data;
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      if (portalKey === 'client') {
        await registerClient(form);
        setMode('signin');
        setNotice('Account created. Sign in with your new username and password.');
      } else {
        navigate('/vendor-application');
      }
    } catch (err) {
      const response = err.response?.data;
      setError(
        (response && typeof response === 'object' ? response.message : response) ||
          'Registration failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 bg-white';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-50 flex items-center justify-center px-4 py-8 sm:py-12">
      {/* Background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors mb-6"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All portals
        </Link>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
          {/* Portal icon and title */}
          {portalInfo && (
            <div className="flex items-center justify-center mb-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${portalInfo.color} flex items-center justify-center shadow-lg`}>
                <portalInfo.icon className="w-8 h-8 text-white" />
              </div>
            </div>
          )}

          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-2">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-center text-sm text-slate-600 mb-6">
            {mode === 'signin'
              ? portalLabel ? `Sign in to the ${portalLabel} Portal` : 'Sign in to your portal'
              : portalLabel ? `Create your ${portalLabel} Portal account` : 'Create a client account'}
          </p>

          {notice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-4 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {notice}
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                <input
                  type="text"
                  name="username"
                  className={inputClass}
                  value={form.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter your username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  className={inputClass}
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Demo credentials */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-medium text-slate-700 mb-2">Demo credentials:</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <p><span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">admin</span> / <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">Admin@123</span></p>
                  <p><span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">client</span> / <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">Admin@123</span></p>
                  <p><span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">coordinator</span> / <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">Admin@123</span></p>
                  <p><span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">vendor</span> / <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">Admin@123</span></p>
                </div>
              </div>

              {signupAllowed && (
                <p className="text-center text-sm text-slate-600">
                  New client?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(''); }}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                  >
                    Create an account
                  </button>
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
                <input
                  type="text"
                  name="fullName"
                  className={inputClass}
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                <input
                  type="text"
                  name="username"
                  className={inputClass}
                  value={form.username}
                  onChange={handleChange}
                  required
                  placeholder="Choose a username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  className={inputClass}
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  className={inputClass}
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength="6"
                  placeholder="Create a password (min 6 characters)"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(''); }}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
