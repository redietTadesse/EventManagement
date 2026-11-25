import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/axios';
import { useApp } from '../context/AppContext';

export default function PasswordRecovery({ reset = false }) {
  const { logout } = useApp();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (reset && window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }, [reset]);
  async function submit(event) {
    event.preventDefault(); setError('');
    if (reset && password !== confirm) { setError('The passwords do not match. Enter the same password twice.'); return; }
    setBusy(true);
    try {
      const { data } = reset ? await authApi.post('/auth/reset-password', { token, password })
        : await authApi.post('/auth/forgot-password', { email });
      if (reset) { logout(); setPassword(''); setConfirm(''); }
      setMessage(data.message);
    } catch (err) { setError(err.response?.data?.message || 'Could not complete this request. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-brand-paper p-5"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
    <Link to="/" className="text-sm font-semibold tracking-widest text-emerald-900">AICC</Link>
    <h1 className="mt-7 text-2xl font-semibold">{reset ? 'Choose a new password' : 'Forgot your password?'}</h1>
    <p className="mb-6 mt-3 text-sm leading-relaxed text-slate-600">{reset ? 'This link works once and expires after 30 minutes. Your older sign-in sessions will end when the password changes.' : 'Enter your account’s email address. If it belongs to an active account, we’ll send a link to reset your password.'}</p>
    {message ? <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">{message}</div> : reset && !token ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Open the complete link from your reset email, or request a new link below.</p> : <form onSubmit={submit} className="space-y-4">
      {reset ? <><label className="grid gap-2 text-sm font-medium">New password<input required type="password" minLength={12} maxLength={72} pattern="[ -~]{12,72}" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="rounded-lg border p-3" /></label><p className="text-xs text-slate-500">Use 12–72 printable characters. Spaces are allowed.</p><label className="grid gap-2 text-sm font-medium">Confirm new password<input required type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} className="rounded-lg border p-3" /></label></> : <label className="grid gap-2 text-sm font-medium">Account email<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="rounded-lg border p-3" /></label>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Please wait…' : reset ? 'Save new password' : 'Email reset link'}</button>
    </form>}
    <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm font-semibold text-emerald-800"><Link to="/login">Back to sign in</Link>{reset && <Link to="/forgot-password">Request a new link</Link>}</div>
  </section></main>;
}
