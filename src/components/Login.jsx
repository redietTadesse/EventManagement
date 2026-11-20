
import AppearanceChoice from './Appearance';
import { useEffect, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { useApp } from '../context/AppContext';
import GoogleClientSignIn from './GoogleClientSignIn';
import api from '../api/axios';
import { ROLE_DASHBOARDS } from '../utils/roles';

import { ArrowLeftIcon, ArrowRightIcon, BuildingOffice2Icon, CalendarDaysIcon, ClipboardDocumentListIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import Brand from './Brand';

const portalLabels = { client: 'Client', coordinator: 'Coordinator', vendor: 'Vendor', admin: 'Administrator' };
const portalDetails = {
  client: ['Plan an event and manage your booking', CalendarDaysIcon],
  coordinator: ['Handle inquiries, events and vendors', ClipboardDocumentListIcon],
  vendor: ['Review offers and event assignments', WrenchScrewdriverIcon],
  admin: ['Manage the center and review performance', BuildingOffice2Icon],
};

export default function Login() {
  const { portal } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { login, registerClient, dispatch } = useApp();

  const [mode, setMode] = useState('signin');

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requestedPortal = portal?.toLowerCase();
  const portalKey = Object.hasOwn(portalLabels, requestedPortal ?? '') ? requestedPortal : 'client';
  const portalLabel = portalLabels[portalKey];

  const signupAllowed = portalKey === 'client';

  useEffect(() => {
    window.scrollTo(0, 0);
    setMode('signin');
    setError('');
    setNotice('');
  }, [portalKey]);
  const handleChange = (e) => {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSignIn = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      const data = await login(
        form.username,
        form.password
      );

      const dashboard = ROLE_DASHBOARDS[data?.role] || '/';

      // Preserve main branch's return-to-page behavior.
      const rolePrefix = dashboard.slice(
        0,
        dashboard.lastIndexOf('/') + 1
      );

      const returnTo = location.state?.returnTo;

      const canReturn =
        rolePrefix !== '/' &&
        typeof returnTo === 'string' &&
        returnTo.startsWith(rolePrefix) &&
        !returnTo.startsWith('//');

      navigate(
        canReturn ? returnTo : dashboard,
        { replace: true }
      );
    } catch (err) {
      let errorMsg =
        'Login failed. Check your credentials.';

      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (
        typeof err.response?.data === 'string'
      ) {
        errorMsg = err.response.data;
      }

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
      if (!portalKey || portalKey === 'client') {
        await registerClient(form);

        setMode('signin');
        setNotice(
          'Account created. Sign in with your new username and password.'
        );
      } else {
        navigate('/vendor-application');
      }
    } catch (err) {
      const response = err.response?.data;

      setError(
        (response && typeof response === 'object'
          ? response.message
          : response) || 'Registration failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 bg-white';

  return (
    <main className="portal-access">
      <header className="portal-access-header"><Brand compact light/><AppearanceChoice/><Link to="/"><ArrowLeftIcon className="w-4 h-4" aria-hidden="true"/>Back to AICC</Link></header>
      <div className="portal-access-grid">
        <section className="portal-choice" aria-labelledby="portal-choice-title">
          <h2 id="portal-choice-title">Choose your portal</h2>
          <nav aria-label="Sign-in portals">
            {Object.entries(portalLabels).map(([key, label]) => {
              const [description, Icon] = portalDetails[key];
              return <Link key={key} to={'/login/' + key} state={location.state} aria-label={label}
                aria-current={portalKey === key ? 'page' : undefined}>
                <Icon aria-hidden="true"/><span><strong>{label}</strong><small>{description}</small></span><ArrowRightIcon aria-hidden="true"/>
              </Link>;
            })}
          </nav>
        </section>
        <div className="signin-form portal-credentials">
          <h1>{mode === 'signin' || !signupAllowed ? portalLabel + ' sign-in' : 'Create a client account'}</h1>
          {/* Success notice */}
          {signupAllowed && <GoogleClientSignIn onSignedIn={async token=>{
            localStorage.setItem('token',token);
            try { const {data}=await api.get('/users/me');
              if (data.role !== 'CLIENT') throw new Error('Google sign-in requires a client account.');
              dispatch({type:'LOGIN',payload:data});
              const destination=location.state?.returnTo;
              navigate(typeof destination==='string'&&destination.startsWith('/client/')?destination:'/client/dashboard',{replace:true});
            } catch(error){localStorage.removeItem('token');throw error;}
          }}/>}
          {notice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-4 text-sm flex items-center gap-2">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {notice}
            </div>
          )}

          {mode === 'signin' || !signupAllowed ? (

            /* Sign in */
            <form
              onSubmit={handleSignIn}
              className="space-y-4"
            >

              {error && (
                <div
                  role="alert"
                  className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="login-username"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Username
                </label>

                <input
                  id="login-username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  className={inputClass}
                  value={form.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Password
                </label>

                <input
                  id="login-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
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
                className="btn-primary w-full"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l-2.647z"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              <p className="text-sm"><Link to="/forgot-password" className="font-semibold text-indigo-700 hover:underline">Forgot your password?</Link></p>
              {import.meta.env.DEV && <details className="demo-accounts"><summary>Local demonstration accounts</summary>

                <div className="space-y-1 text-xs text-slate-600">

                  {[
                    'admin',
                    'client',
                    'coordinator',
                    'vendor',
                  ].map((role) => (
                    <p key={role}>
                      <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">
                        {role}
                      </span>
                      {' / '}
                      <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded">
                        Admin@123
                      </span>
                    </p>
                  ))}

                </div>
              </details>}

              {(!portalKey || portalKey === 'vendor') && (
                <p className="text-center text-sm text-slate-600">
                  New vendor?{' '}
                  <Link
                    to="/vendor-application"
                    className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                  >
                    Register your company
                  </Link>
                </p>
              )}

              {signupAllowed && (
                <p className="text-center text-sm text-slate-600">
                  New client?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError('');
                      setNotice('');
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                  >
                    Create an account
                  </button>
                </p>
              )}

            </form>

          ) : (

            /* Client registration */
            <form
              onSubmit={handleSignUp}
              className="space-y-4"
            >

              {error && (
                <div
                  role="alert"
                  className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Full name
                </label>

                <input
                  id="signup-name"
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  className={inputClass}
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-username"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Username
                </label>

                <input
                  id="signup-username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  className={inputClass}
                  value={form.username}
                  onChange={handleChange}
                  required
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Email
                </label>

                <input
                  id="signup-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  className={inputClass}
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Password
                </label>

                <input
                  id="signup-password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  className={inputClass}
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Create a password (min 6 characters)"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l-2.647z"
                      />
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
                  onClick={() => {
                    setMode('signin');
                    setError('');
                    setNotice('');
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Sign in
                </button>
              </p>

            </form>
          )}
        </div>
      </div>

    </main>
  );
}
