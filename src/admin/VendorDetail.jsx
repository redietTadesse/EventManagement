import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import VendorPerformanceModal from '../components/VendorPerformanceModal';
import api from '../api/axios';
import { normalizeVendor } from '../utils/vendors';

export default function VendorDetail() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/vendors/${id}`, { signal });
      if (!signal?.aborted) setVendor(normalizeVendor(data));
    } catch (err) {
      if (!signal?.aborted) setError(err.response?.data?.message || 'Could not load vendor.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [id]);
  useEffect(() => {
    const controller = new AbortController();
    setVendor(null);
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  async function toggle() {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/vendors/${id}/toggle-active`);
      setVendor(normalizeVendor(data));
    } catch (err) { setError(err.response?.data?.message || 'Could not change vendor status.'); }
    finally { setSaving(false); }
  }
  return <Layout title="Vendor Details"><div className="mx-auto max-w-4xl space-y-6">
    <Link to="/admin/vendors" className="text-sm text-indigo-700">← Vendors</Link>
    {loading && <p role="status">Loading vendor…</p>}
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error} <button onClick={() => load()} className="underline">Retry</button></div>}
    {!loading && vendor && <>
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-slate-900">{vendor.companyName}</h1><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{vendor.isActive ? 'Active' : 'Inactive'}</span></div>
      <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="mb-4 font-semibold">Vendor Information</h2><dl className="grid gap-5 sm:grid-cols-2">
        {[['Company name', vendor.companyName], ['Service category', vendor.serviceCategory], ['Email', vendor.email], ['Phone', vendor.phone], ['Insurance expiry', vendor.insuranceExpiryDate], ['Rating', vendor.rating == null ? 'Not rated' : `${vendor.rating} / 5`]].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="break-words font-medium">{value || '—'}</dd></div>)}
      </dl>{vendor.description && <p className="mt-5 whitespace-pre-wrap text-sm text-slate-600">{vendor.description}</p>}</section>
      <div className="flex flex-wrap gap-3"><Link to={`/admin/vendors/${id}/edit`} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Edit Vendor</Link><button disabled={saving} onClick={toggle} className="rounded-lg border px-4 py-2 disabled:opacity-50">{saving ? 'Saving…' : vendor.isActive ? 'Deactivate' : 'Activate'}</button><button onClick={() => setProfileOpen(true)} className="rounded-lg border px-4 py-2">Performance and history</button></div>
      {profileOpen && <VendorPerformanceModal vendorId={vendor.id} onClose={() => setProfileOpen(false)} />}
    </>}
  </div></Layout>;
}
