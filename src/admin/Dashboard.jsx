import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';
import useApiResource from '../hooks/useApiResource';
import LifecycleDashboard from './LifecycleDashboard';
import ManagementOutlook from './ManagementOutlook';
import BookingPerformance from './BookingPerformance';
const RevenueDashboard = lazy(() => import('./RevenueDashboard'));

function RevenueSnapshot({ onDetails }) {
  const resource = useApiResource('/admin/dashboard/revenue?months=3');
  const report = resource.data?.verified ? resource.data : null;
  const currency = new Intl.NumberFormat('en', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 });
  return <section className="surface p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Revenue and payments</h2><p className="mt-1 text-sm text-slate-600">{report ? report.fromMonth + ' through ' + report.throughMonth : 'Current three calendar months'}</p></div><button className="btn-outline" onClick={onDetails}>View revenue detail</button></div>
    {resource.loading && <p role="status" className="mt-4 text-sm">Loading payments…</p>}
    {resource.error && <p role="alert" className="mt-4 text-sm text-rose-800">{resource.error} <button className="underline" onClick={resource.reload}>Retry</button></p>}
    {report && <><div className="mt-5 grid gap-4 sm:grid-cols-3">{[['Verified payments', report.verified], ['Awaiting client receipt', report.awaitingReceipt], ['Awaiting staff verification', report.awaitingReview]].map(([label, amount]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{currency.format(amount.totalEtb)}</p><p className="mt-1 text-xs text-slate-500">{amount.contracts} contracts</p></div>)}</div><p className="mt-4 text-xs leading-relaxed text-slate-500">Verified figures use receipt verification dates and full contract values. Outstanding amounts cover current signed agreements for upcoming events. Refunds and operating costs are not recorded here.</p></>}
  </section>;
}

function EmailDiagnostics() {
  const status = useApiResource('/admin/emails/status');
  const log = useApiResource('/admin/emails/log');

  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Email delivery diagnostics</h2>
        <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => { status.reload(); log.reload(); }}>
          Refresh email diagnostics
        </button>
      </div>
      {status.error && <p role="alert" className="text-rose-700">{status.error}</p>}
      {status.loading && <p>Loading email status…</p>}
      {typeof status.data.enabled === 'boolean' && (
        <p className="mt-2 text-sm text-slate-600">Email delivery is {status.data.enabled ? 'enabled' : 'disabled'}.</p>
      )}
      <p className="mt-2 text-xs text-slate-500">Recent attempts from this server session. Accepted by mail server confirms submission to the mail provider.</p>
      {log.error && <p role="alert" className="text-rose-700">{log.error}</p>}
      {log.loading && <p>Loading email log…</p>}
      {!log.loading && !log.error && log.data.length === 0 && <p className="mt-2 text-sm text-slate-600">No email delivery attempts recorded.</p>}
      {log.data.length > 0 && (
        <ul className="mt-3 max-h-64 divide-y overflow-auto text-sm text-slate-700">
          {log.data.map((entry, index) => <li key={index} className="whitespace-pre-wrap break-words py-2">{entry}</li>)}
        </ul>
      )}
    </section>
  );
}


export default function AdminDashboard() {
  const [tab, setTab] = useState('business');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get('/admin/dashboard/stats'); setStats(data); }
    catch (failure) { setError(failure.response?.data?.message || 'Could not load administration summary.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (tab === 'administration') load(); }, [tab, load]);
  return <Layout title="Management overview"><div className="space-y-6">
    <div><p className="eyebrow">AICC management</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Business and booking performance</h1><p className="mt-2 text-sm text-slate-600">Review business demand, paid bookings, venue use, and the work requiring follow-up.</p></div>
    <div role="tablist" aria-label="Management views" className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
      {[['business','Business overview'],['revenue','Revenue'],['administration','Administration']].map(([key,label]) => <button key={key} role="tab" id={'management-tab-' + key} aria-controls={'management-panel-' + key} aria-selected={tab === key} className={'rounded-lg px-4 py-2 text-sm font-semibold ' + (tab === key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50')} onClick={() => setTab(key)}>{label}</button>)}
    </div>
    <section role="tabpanel" id={'management-panel-' + tab} aria-labelledby={'management-tab-' + tab} className="space-y-6">
      {tab === 'business' && <><RevenueSnapshot onDetails={() => setTab('revenue')} /><BookingPerformance /><LifecycleDashboard /><ManagementOutlook /></>}
      {tab === 'revenue' && <Suspense fallback={<p role="status">Loading revenue dashboard…</p>}><RevenueDashboard /></Suspense>}
      {tab === 'administration' && <>
        <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">System administration</h2><button className="btn-outline" disabled={loading} onClick={load}>Refresh summary</button></div>
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        <div className="flex flex-wrap gap-3"><Link className="btn-primary" to="/admin/coordinators">Add coordinator</Link><Link className="btn-outline" to="/admin/vendors/new">Add vendor</Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Total users','totalUsers'],['Active users','activeUsers'],['Active vendors','activeVendors'],['Events','totalEvents']].map(([label,key]) => <section className="surface p-5" key={key}><h3 className="text-sm text-slate-500">{label}</h3><p className="mt-2 text-3xl font-semibold">{loading ? '—' : stats?.[key] ?? '—'}</p></section>)}</div>
        <div className="flex flex-wrap gap-3"><Link className="btn-outline" to="/admin/vendors">Vendor management</Link><Link className="btn-outline" to="/admin/venues">Venue management</Link></div>
        <EmailDiagnostics />
      </>}
    </section>
  </div></Layout>;
}
