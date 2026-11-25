import VenueLightField from '../components/VenueLightField';
import UnmetDemand from './UnmetDemand';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';
import useApiResource from '../hooks/useApiResource';
import LifecycleDashboard from './LifecycleDashboard';
import ManagementOutlook from './ManagementOutlook';
import BookingPerformance from './BookingPerformance';
import ViewTabs from '../components/ViewTabs';
const RevenueDashboard = lazy(() => import('./RevenueDashboard'));

function RevenueSnapshot({ months, setMonths, onDetails }) {
  const resource = useApiResource('/admin/dashboard/revenue?months=' + months);
  const report = resource.data?.monthly?.length === months ? resource.data : null;
  const money = amount => new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(amount);
  const peak = Math.max(1, ...(report?.monthly || []).map(row => row.totalEtb));
  return <section className="revenue-ledger" aria-label="Revenue and payments">
    <header><h2>Verified payments</h2><label>Reporting period<select value={months} onChange={e => setMonths(Number(e.target.value))}>{[3,6,12].map(n => <option key={n} value={n}>Last {n} months</option>)}</select></label></header>
    {resource.error ? <p role="alert">{resource.error} <button onClick={resource.reload}>Try again</button></p>
      : !report ? <p role="status">Loading payments…</p> : <>
      <div className="ledger-main"><div><div className="ledger-total"><small>ETB</small> {money(report.verified.totalEtb)}</div>
        <p>{report.verified.contracts} verified contracts · {report.fromMonth} to {report.throughMonth}</p>
        <button type="button" onClick={onDetails}>View payment breakdown →</button></div>
        <div className="ledger-chart" aria-label="Monthly verified payments in ETB">{report.monthly.map(row => <div key={row.month}>
          <i style={{height: (68 * row.totalEtb / peak) + 'px'}} aria-hidden="true"/><span>{new Intl.DateTimeFormat('en',{month:'short',timeZone:'UTC'}).format(new Date(row.month+'-01T00:00:00Z'))}</span>
          <span className="sr-only">{row.month}, ETB {money(row.totalEtb)}</span></div>)}</div></div>
      <dl className="ledger-outstanding">{[['Awaiting client receipt',report.awaitingReceipt],['Awaiting staff verification',report.awaitingReview]].map(([label,value]) =>
        <div key={label}><dt>{label}</dt><dd>ETB {money(value.totalEtb)} <small>· {value.contracts} contracts</small></dd></div>)}</dl>
      <p className="ledger-note">Verified totals use receipt review dates. Outstanding amounts cover current signed contracts for upcoming events.</p></>}
  </section>;
}

function EmailDiagnostics() {
  const status = useApiResource('/admin/emails/status');
  const log = useApiResource('/admin/emails/log');

  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Email delivery status</h2>
        <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => { status.reload(); log.reload(); }}>
          Refresh email status
        </button>
      </div>
      {status.error && <p role="alert" className="text-rose-700">{status.error}</p>}
      {status.loading && <p>Loading email status…</p>}
      {typeof status.data.enabled === 'boolean' && (
        <p className="mt-2 text-sm text-slate-600">Email delivery is {status.data.enabled ? 'enabled' : 'disabled'}.</p>
      )}
      <p className="mt-2 text-xs text-slate-500">Recent attempts from this server session. Accepted means the email provider received the message for delivery. It does not confirm arrival in the inbox.</p>
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
  const [params, setParams] = useSearchParams();
  const [months, setMonths] = useState(3);
  const tab = ['business', 'revenue', 'bookings', 'demand', 'administration'].includes(params.get('view')) ? params.get('view') : 'business';
  const setTab = value => setParams(previous => { const next = new URLSearchParams(previous); next.set('view', value); return next; });
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
    <header className="desk-mast"><VenueLightField/><div><p>Management workspace</p><h1>Business overview</h1><span>Payments, booking progress and demand for AICC venues</span></div></header>
    <ViewTabs id="management" label="Management views" value={tab} onChange={setTab} items={[
      ['business','Business overview'], ['revenue','Revenue'], ['bookings','Bookings & team'], ['demand','Unmet requests'], ['administration','Administration'],
    ]} />
    <section role="tabpanel" id={'management-panel-' + tab} aria-labelledby={'management-tab-' + tab} className="space-y-6">
      {tab === 'business' && <><RevenueSnapshot months={months} setMonths={setMonths} onDetails={() => setTab('revenue')} /><LifecycleDashboard /><ManagementOutlook /></>}
      {tab === 'bookings' && <BookingPerformance />}
      {tab === 'demand' && <UnmetDemand />}
      {tab === 'revenue' && <Suspense fallback={<p role="status">Loading revenue dashboard…</p>}><RevenueDashboard months={months} setMonths={setMonths}/></Suspense>}
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
