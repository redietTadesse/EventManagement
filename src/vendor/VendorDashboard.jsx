import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Skeleton from '../components/Skeleton';
import { ArrowRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useApp } from '../context/AppContext';

const formatDate = (value) => {
  if (!value) return 'Date not set';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getLocalDate = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

export default function VendorDashboard() {
  const { state, fetchMyVendorProfile, fetchMyAssignments } = useApp();
  const { currentUser } = state;

  const [folder, setFolder] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [limit, setLimit] = useState(8);
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [assignmentsError, setAssignmentsError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.allSettled([
          fetchMyVendorProfile(),
          fetchMyAssignments(),
        ]);
        if (cancelled) return;
        const [profileResult, assignmentsResult] = results;
        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
          setProfileError('');
        } else {
          setProfileError(profileResult.reason.response?.data?.message || 'Could not load your vendor profile.');
        }
        if (assignmentsResult.status === 'fulfilled') {
          setAssignments(Array.isArray(assignmentsResult.value) ? assignmentsResult.value : []);
          setAssignmentsError('');
        } else {
          setAssignmentsError(assignmentsResult.reason.response?.data?.message || 'Could not load your assignments.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchMyVendorProfile, fetchMyAssignments, reloadKey]);

  if (loading) {
    return (
      <Layout title="Vendor Dashboard">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </Layout>
    );
  }

  const pending = assignments.filter(a => a.status === 'PENDING');
  const accepted = assignments.filter(a => a.status === 'ACCEPTED');
  const insuranceExpiryDate = profile?.insuranceExpiryDate?.slice(0, 10);
  const insuranceExpired = insuranceExpiryDate && insuranceExpiryDate < getLocalDate();
  const isFlagged = Boolean(profile?.flaggedForDeactivation);

  const upcoming = accepted.filter(item => item.eventDate >= getLocalDate())
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const responseQueue = [...pending].sort((a, b) => (a.expiresAt || '9999').localeCompare(b.expiresAt || '9999'));
  const view = folder || (responseQueue.length ? 'offers' : 'upcoming');
  const rows = view === 'offers' ? responseQueue : upcoming;
  const selected = rows.find(item => item.id === selectedId) || rows[0];
  return <Layout title="Vendor overview"><div className="space-y-6">
    <header className="desk-mast"><div><p>Vendor workspace</p><h1>Offers & commitments</h1><span>{profile?.companyName || currentUser?.fullName}</span></div>
      <div className="mast-actions"><Link className="btn-primary" to="/vendor/open">Find open requests <ArrowRightIcon/></Link></div></header>
    {isFlagged && <div className="rounded-xl border border-rose-300 bg-rose-50 p-5" role="alert"><h2 className="font-semibold text-rose-900">Your vendor account needs review</h2><p className="mt-2 text-sm text-rose-800">Your account has confirmed reports of missed events. AICC will review these before deciding on any account changes. Contact AICC with supporting information if a report is incorrect.</p></div>}
    {(profileError || assignmentsError) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      {profileError || assignmentsError}
      <button type="button" onClick={() => { setLoading(true); setReloadKey(key => key + 1); }} className="ml-3 font-semibold underline">Try again</button>
    </div>}
    {insuranceExpiryDate && <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${insuranceExpired ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'}`}>
      <span>Insurance {insuranceExpired ? 'expired' : 'valid through'} <strong>{formatDate(insuranceExpiryDate)}</strong></span>
      {insuranceExpired && <span>Contact AICC to update your record.</span>}
    </div>}
    <section className="desk-sheet">
      <header className="desk-heading"><div><h2>Assignment inbox</h2><p>Offers are ordered by response deadline. Accepted work is ordered by event date.</p></div><Link className="btn-outline" to="/vendor/assignments">All assignments</Link></header>
      {assignmentsError ? <p className="desk-notice">Your assignment list is unavailable.</p> : <div className="plan-library">
        <div className="plan-shelf"><div className="desk-switch">{[['offers','Offers',responseQueue.length],['upcoming','Upcoming',upcoming.length]].map(([key,label,count]) =>
          <button key={key} aria-pressed={view === key} onClick={() => { setFolder(key); setLimit(8); }}>{label} <span>{count}</span></button>)}</div>
          <ul>{rows.slice(0,limit).map(item => <li key={item.id}><button className="shelf-item" aria-pressed={item.id === selected?.id} onClick={() => setSelectedId(item.id)}>
            <span>{item.serviceCategory?.replaceAll('_',' ')}</span><strong>{item.eventName}</strong><small><CalendarDaysIcon/>{formatDate(item.eventDate)}</small>
          </button></li>)}</ul>{rows.length > limit && <button className="lane-more" onClick={() => setLimit(limit + 8)}>Show more assignments</button>}</div>
        {selected ? <article className="plan-brief"><header><StatusBadge status={selected.status}/><h2>{selected.eventName}</h2><p>{formatDate(selected.eventDate)} · {selected.eventVenue || 'Venue pending'}</p></header>
          <div className="plan-next"><h3>{selected.serviceCategory?.replaceAll('_',' ')} service</h3>
            <p>{view === 'offers' ? 'Review the service details and respond to AICC.' : 'You have accepted this assignment. Open it for details or to report an issue.'}</p>
            {view === 'offers' && selected.expiresAt && <p className="payment-line">Response deadline · {new Date(selected.expiresAt).toLocaleString()}</p>}
            <Link className="btn-primary" to={'/vendor/assignments/' + selected.id}>{view === 'offers' ? 'Review and respond' : 'Open assignment'}<ArrowRightIcon/></Link></div>
          <footer><span>Coordinator <strong>{selected.coordinator?.name || 'Awaiting assignment'}</strong></span></footer></article>
          : <div className="plan-blank"><h3>{view === 'offers' ? 'No offers awaiting your response' : 'No upcoming commitments'}</h3><Link to="/vendor/open" className="btn-outline">Explore open requests</Link></div>}
      </div>}
    </section>
  </div></Layout>;
}
