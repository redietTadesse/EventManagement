import { useState } from 'react';
import Layout from '../components/Layout';
import useApiResource from '../hooks/useApiResource';
import api from '../api/axios';
import CoordinatorWorkQueue from './CoordinatorWorkQueue';

const fields = [
  { name: 'fullName', label: 'Full name', maxLength: 100, autoComplete: 'off' },
  { name: 'username', label: 'Username', pattern: '[a-zA-Z0-9._\\-]{3,50}', title: '3–50 letters, numbers, dots, underscores or hyphens', autoComplete: 'off' },
  { name: 'email', label: 'Email', type: 'email', maxLength: 100, autoComplete: 'off' },
  { name: 'password', label: 'Initial password', type: 'password', minLength: 12, maxLength: 72, pattern: '[ -~]{12,72}', autoComplete: 'new-password' },
];

export default function Coordinators() {
  const { data: coordinators, loading, error, reload } = useApiResource('/admin/coordinators');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');

  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setNotice('');
    setSaveError('');
    try {
      const { data } = await api.post('/admin/coordinators', Object.fromEntries(new FormData(form)));
      form.reset();
      setNotice(`Coordinator account created for ${data.username}.`);
      reload();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Could not create the coordinator account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Coordinators">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Coordinators</h1>
        <CoordinatorWorkQueue />
        <form onSubmit={create} className="space-y-4 rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Add coordinator</h2>
          <p className="text-sm text-slate-600">Create an account for the Coordinator Portal. Use a unique password with 12–72 printable ASCII characters.</p>
          <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ label, ...input }) => (
              <label key={input.name} className="space-y-1 text-sm font-medium">
                <span>{label}</span>
                <input {...input} required className="block w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
            ))}
            <button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">
              {saving ? 'Creating…' : 'Create coordinator'}
            </button>
          </fieldset>
          {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
          {saveError && <p role="alert" className="text-sm text-rose-700">{saveError}</p>}
        </form>
        <section className="space-y-3 rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Coordinator accounts</h2>
          {loading && <p>Loading coordinators…</p>}
          {error && <p role="alert">{error} <button onClick={reload} className="underline">Retry</button></p>}
          {!loading && !error && coordinators.length === 0 && <p>No coordinator accounts yet.</p>}
          <ul className="divide-y">
            {coordinators.map(({ id, fullName, username, email }) => (
              <li key={id} className="py-3">
                <p className="font-medium">{fullName || username}</p>
                <p className="break-words text-sm text-slate-600">{username} · {email}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Layout>
  );
}
