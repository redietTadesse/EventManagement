import { Link } from 'react-router-dom';
import { ArrowRightIcon, PlusIcon, CalendarDaysIcon, DocumentTextIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import useApiResource from '../hooks/useApiResource';
import { formatDate, snakeToTitleCase } from '../utils/helpers';
import { calendarDateKey } from '../hooks/useVenueAvailabilityCalendar';

export default function ClientDashboard() {
  const { state: { currentUser } } = useApp();
  const inquiries = useApiResource(currentUser?.id ? `/inquiries/client/${currentUser.id}` : null);
  const events = useApiResource('/events');
  const mine = inquiries.data.filter(item => String(item.clientId) === String(currentUser?.id));
  const decisions = mine.filter(item => ['PROPOSAL_SENT', 'PROPOSAL_ACCEPTED'].includes(item.status));
  const upcoming = events.data.filter(event => !['CANCELLED', 'CLOSED', 'COMPLETED'].includes(event.status)
    && (event.endDate || event.eventDate) >= calendarDateKey(new Date()))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const recent = [...mine].sort((a, b) => b.id - a.id).slice(0, 5);
  const metric = (resource, count) => resource.loading || resource.error ? '—' : count;
  const firstName = (currentUser?.fullName || currentUser?.username || '').split(' ')[0];

  return <Layout title="Your overview"><div className="space-y-6">
    <PageHeader eyebrow="Your event journey" title={firstName ? `Welcome, ${firstName}` : 'Your event overview'}
      subtitle="Keep your plans moving, from the first inquiry to the day of your event."
      action={<Link to="/client/new-inquiry" className="btn-primary"><PlusIcon className="h-4 w-4" />Plan an event</Link>} />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard label="Your inquiries" value={metric(inquiries, mine.length)} icon={<DocumentTextIcon />} detail="All event requests" />
      <StatCard label="Booking steps" value={metric(inquiries, decisions.length)} icon={<ClockIcon />} color="amber" detail="Proposals and accepted bookings" />
      <StatCard label="Upcoming events" value={metric(events, upcoming.length)} icon={<CalendarDaysIcon />} detail="Scheduled and in preparation" />
      <StatCard label="Completed events" value={metric(events, events.data.filter(item => item.status === 'COMPLETED').length)} icon={<CheckCircleIcon />} color="green" detail="Your past events" />
    </div>
    {(inquiries.error || events.error) && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      {inquiries.error || events.error} <button type="button" onClick={() => { inquiries.reload(); events.reload(); }} className="ml-2 font-semibold underline">Try again</button>
    </div>}
    {!inquiries.loading && !inquiries.error && decisions.length > 0 && <section className="surface overflow-hidden">
      <div className="section-heading"><div><p className="eyebrow mb-1">Keep things moving</p><h2>Your next booking steps</h2></div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">{decisions.length} to follow up</span>
      </div>
      <ul className="divide-y divide-slate-100">{decisions.map(inquiry => <li key={inquiry.id}>
        <Link to={`/client/inquiries/${inquiry.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-indigo-50/50 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><DocumentTextIcon className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{snakeToTitleCase(inquiry.eventType)} · {formatDate(inquiry.eventDate)}</span>
            <span className="mt-1 block text-sm text-slate-500">{inquiry.status === 'PROPOSAL_SENT' ? 'Review your proposal and respond to the coordinator.' : 'Follow your contract signatures and payment receipt.'}</span></span>
          <ArrowRightIcon className="h-4 w-4 shrink-0 text-indigo-600" />
        </Link>
      </li>)}</ul>
    </section>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="surface overflow-hidden">
        <div className="section-heading"><h2>Recent inquiries</h2><Link to="/client/inquiries" className="text-sm font-medium text-indigo-700">View all</Link></div>
        {inquiries.loading ? <p role="status" className="p-8 text-sm text-slate-500">Loading inquiries…</p>
          : inquiries.error ? <p className="p-6 text-sm text-rose-700">Your inquiries could not be loaded.</p>
          : recent.length === 0 ? <EmptyState title="Start with an idea" description="Tell us your dates, guest count, and the services you need." actionLink="/client/new-inquiry" actionText="Create your first inquiry" />
          : <ul className="divide-y divide-slate-100">{recent.map(inquiry => <li key={inquiry.id}>
            <Link to={`/client/inquiries/${inquiry.id}`} className="block px-5 py-4 hover:bg-slate-50 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">{snakeToTitleCase(inquiry.eventType)} <span className="ml-1 text-xs font-normal text-slate-400">#{inquiry.id}</span></span>
                <StatusBadge status={inquiry.status} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{formatDate(inquiry.eventDate)} · {inquiry.expectedAttendees} guests</p>
              <p className="mt-1 text-xs text-slate-500">Handled by {inquiry.coordinator?.name || 'a coordinator to be assigned'}</p>
            </Link>
          </li>)}</ul>}
      </section>
      <section className="surface overflow-hidden">
        <div className="section-heading"><h2>Coming up</h2><Link to="/client/events" className="text-sm font-medium text-indigo-700">All events</Link></div>
        {events.loading ? <p role="status" className="p-8 text-sm text-slate-500">Loading events…</p>
          : events.error ? <p className="p-6 text-sm text-rose-700">Your events could not be loaded.</p>
          : upcoming.length === 0 ? <EmptyState title="Your next event starts here" description="Your booked events will appear here as you complete the proposal and payment steps." size="small" />
          : <ul className="divide-y divide-slate-100">{upcoming.slice(0, 4).map(event => <li key={event.id}>
            <Link to={`/client/events/${event.id}`} className="block px-5 py-5 hover:bg-slate-50 sm:px-6">
              <p className="mb-2 text-xs font-semibold text-indigo-700">{formatDate(event.eventDate)}</p>
              <p className="font-semibold text-slate-800">{event.name}</p>
              <p className="mb-3 mt-1 text-sm text-slate-500">{event.venue || 'Venue pending'}</p>
              <StatusBadge status={event.status} />
            </Link>
          </li>)}</ul>}
      </section>
    </div>
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-indigo-900">From an inquiry to a confirmed event</h2>
      <ol className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-4">
        {['Share your requirements', 'Agree on the proposal', 'Sign and submit payment', 'Follow event preparation'].map((step, index) =>
          <li key={step} className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-white text-xs font-semibold text-indigo-700">{index + 1}</span>{step}</li>)}
      </ol>
    </section>
  </div></Layout>;
}
