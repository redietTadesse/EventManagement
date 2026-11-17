import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Skeleton from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { ArrowRightIcon, ClockIcon, CalendarDaysIcon, CheckCircleIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
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
  const declined = assignments.filter(a => a.status === 'DECLINED');
  const completed = assignments.filter(a => a.status === 'COMPLETED');
  const closed = assignments.filter(a => a.status === 'EXPIRED' || a.status === 'CANCELLED');
  const insuranceExpiryDate = profile?.insuranceExpiryDate?.slice(0, 10);
  const insuranceExpired = insuranceExpiryDate && insuranceExpiryDate < getLocalDate();

  const upcoming = accepted.filter(item => item.eventDate >= getLocalDate())
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const responseQueue = [...pending].sort((a, b) => (a.expiresAt || '9999').localeCompare(b.expiresAt || '9999'));
  const metrics = [
    ['Awaiting response', pending.length, <ClockIcon />, 'amber', 'PENDING'],
    ['Accepted assignments', accepted.length, <CalendarDaysIcon />, 'navy', 'ACCEPTED'],
    ['Completed', completed.length, <CheckCircleIcon />, 'green', 'COMPLETED'],
    ['Closed offers', closed.length + declined.length, <ArchiveBoxIcon />, 'navy', 'ALL'],
  ];

  return <Layout title="Vendor overview"><div className="space-y-6">
    <PageHeader eyebrow="Vendor workspace" title={profile?.companyName || currentUser?.fullName || 'Your assignments'}
      subtitle="Respond to service offers and prepare for your upcoming commitments."
      action={<Link to="/vendor/open" className="btn-primary">Explore open requests<ArrowRightIcon className="h-4 w-4" /></Link>} />
    {(profileError || assignmentsError) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      {profileError || assignmentsError}
      <button type="button" onClick={() => { setLoading(true); setReloadKey(key => key + 1); }} className="ml-3 font-semibold underline">Try again</button>
    </div>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map(([label, value, icon, color, status]) => <Link key={label} to={`/vendor/assignments?status=${status}`} className="rounded-2xl focus-visible:outline-offset-4">
        <StatCard label={label} value={assignmentsError ? '—' : value} icon={icon} color={color} />
      </Link>)}
    </div>
    {insuranceExpiryDate && <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${insuranceExpired ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'}`}>
      <span>Insurance {insuranceExpired ? 'expired' : 'valid through'} <strong>{formatDate(insuranceExpiryDate)}</strong></span>
      {insuranceExpired && <span>Contact AICC to update your record.</span>}
    </div>}
    <div className="grid items-start gap-6 xl:grid-cols-2">
      {[{ title: 'Needs your response', note: 'Service offers, ordered by response deadline.', rows: responseQueue, status: 'PENDING', empty: 'You are up to date', detail: 'New service offers will appear here.' },
        { title: 'Upcoming commitments', note: 'Accepted work to prepare for.', rows: upcoming, status: 'ACCEPTED', empty: 'No upcoming commitments', detail: 'Your accepted assignments will appear here.' }].map(section =>
        <section className="surface overflow-hidden" key={section.title}>
          <div className="section-heading"><div><h2>{section.title}</h2><p>{section.note}</p></div>
            <Link className="text-sm font-medium text-indigo-700" to={`/vendor/assignments?status=${section.status}`}>View all</Link></div>
          {assignmentsError ? <p className="p-6 text-sm text-rose-700">Assignments could not be loaded.</p>
            : !section.rows.length ? <EmptyState title={section.empty} description={section.detail} size="small" />
            : <ul className="divide-y divide-slate-100">{section.rows.slice(0, 5).map(assignment =>
              <li key={assignment.id}><Link className="block px-5 py-5 hover:bg-slate-50 sm:px-6" to={`/vendor/assignments/${assignment.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">{assignment.eventName}</p><ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-indigo-600" />
                </div>
                <p className="mt-1 text-sm capitalize text-slate-600">{assignment.serviceCategory?.replaceAll('_', ' ')} · {formatDate(assignment.eventDate)}</p>
                <p className="mt-1 text-xs text-slate-500">{assignment.eventVenue || 'Venue pending'} · {assignment.coordinator?.name || 'Coordinator to be assigned'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={assignment.status} />
                  {assignment.status === 'PENDING' && assignment.expiresAt && <span className="text-xs text-amber-800">Respond by {new Date(assignment.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                </div>
              </Link></li>)}</ul>}
        </section>)}
    </div>
  </div></Layout>;
}
