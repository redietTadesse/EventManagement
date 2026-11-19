import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, ArrowUpRightIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import ResponsiveTable from '../components/ResponsiveTable';
import EmptyState from '../components/EmptyState';
import EventPageControls from '../components/EventPageControls';
import useApiResource from '../hooks/useApiResource';
import { useApp } from '../context/AppContext';
import { eventPage } from '../utils/eventPages';
import { statusLabel } from '../utils/status';
import { formatEventDate } from './eventDetailModel';

export default function AllInquiries() {
  const { state } = useApp();
  const { data: inquiries, loading, error, reload } = useApiResource('/inquiries');
  const [ownership, setOwnership] = useState('all');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [attendance, setAttendance] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  useEffect(() => setPageNumber(1), [ownership, filter, search, eventType, eventDate, attendance]);
  const statuses = ['All', ...new Set(inquiries.map(inquiry => inquiry.status).filter(Boolean))];
  const eventTypes = [...new Set(inquiries.map(inquiry => inquiry.eventType).filter(Boolean))].sort();
  const owned = inquiries.filter(inquiry => (ownership !== 'mine' || String(inquiry.coordinator?.id) === String(state.currentUser?.id)) && (ownership !== 'unassigned' || !inquiry.coordinator));
  const filtered = owned.filter(inquiry => (filter === 'All' || inquiry.status === filter)
    && `${inquiry.eventName || ''} ${inquiry.clientName || ''} ${inquiry.id}`.toLowerCase().includes(search.trim().toLowerCase())
    && (!eventType || inquiry.eventType === eventType) && (!eventDate || inquiry.eventDate === eventDate)
    && (!attendance || inquiry.expectedAttendees === Number(attendance)));
  const page = eventPage(filtered, pageNumber);
  const extraFilters = [eventType, eventDate, attendance].filter(Boolean).length;
  function clear() { setSearch(''); setEventType(''); setEventDate(''); setAttendance(''); setFilter('All'); setOwnership('all'); }

  return <Layout title="Client inquiries"><div className="space-y-5">
    <PageHeader eyebrow="From first interest to booking" title="Client inquiries" subtitle="Find a request, check who is handling it, and open the next booking step."
      action={<button type="button" onClick={reload} disabled={loading} className="btn-outline"><ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>} />
    <div>
      <div className="record-filters"><label className="record-search"><MagnifyingGlassIcon aria-hidden="true" /><span className="sr-only">Search event name, client or inquiry number</span><input type="search" placeholder="Find an event, client or request number…" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <div className="ownership-control" aria-label="Whose inquiries to show">{[['all', 'All work'], ['mine', 'Mine'], ['unassigned', 'Unclaimed']].map(([key, label]) => <button type="button" key={key} aria-pressed={ownership === key} onClick={() => setOwnership(key)}>{label}</button>)}</div>
        <button type="button" className="record-filter-trigger" aria-expanded={filtersOpen} aria-controls="inquiry-more-filters" onClick={() => setFiltersOpen(value => !value)}><AdjustmentsHorizontalIcon aria-hidden="true" />Filters{extraFilters ? ` · ${extraFilters}` : ''}</button>
      </div>
      {filtersOpen && <div id="inquiry-more-filters" className="inquiry-additional-filters">
        <label>Event type<select value={eventType} onChange={event => setEventType(event.target.value)}><option value="">All event types</option>{eventTypes.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
        <label>Event date<input type="date" value={eventDate} onChange={event => setEventDate(event.target.value)} /></label>
        <label>Estimated attendees<input type="number" min="1" value={attendance} onChange={event => setAttendance(event.target.value)} /></label>
      </div>}
    </div>
    <div className="inquiry-stage-filters" aria-label="Filter by inquiry stage">{statuses.map(status => <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === 'All' ? 'All stages' : statusLabel(status)}<span>{status === 'All' ? owned.length : owned.filter(row => row.status === status).length}</span></button>)}{(extraFilters > 0 || search || filter !== 'All' || ownership !== 'all') && <button type="button" onClick={clear} className="underline">Clear filters</button>}</div>
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error} <button type="button" onClick={reload} className="ml-2 underline">Try again</button></div>}
    <section className="surface overflow-hidden" aria-label="Client inquiry results" aria-busy={loading}>
      {loading ? <p role="status" className="p-10 text-center text-sm text-slate-500">Loading client inquiries…</p> : error ? <EmptyState title="Inquiries could not be loaded" description="Try refreshing to retrieve the latest records." actionText="Try again" actionOnClick={reload} /> : page.rows.length ? <ResponsiveTable columns={[
        { key: 'event', label: 'Event / client', render: inquiry => <Link to={`/coordinator/inquiries/${inquiry.id}`}><span><span className="inquiry-record-name">{inquiry.eventName || `${inquiry.eventType || 'Event'} request`}</span><span className="inquiry-record-subtitle">#{inquiry.id} · {inquiry.clientName}</span></span></Link> },
        { key: 'date', label: 'Event date', render: inquiry => <span>{formatEventDate(inquiry.eventDate)}<small className="inquiry-record-subtitle mt-1">{inquiry.expectedAttendees} guests · {inquiry.eventType?.replaceAll('_', ' ')}</small></span> },
        { key: 'coordinator', label: 'Handling coordinator', render: inquiry => inquiry.coordinator?.name || <span className="text-amber-700">Available to claim</span> },
        { key: 'status', label: 'Current stage', render: inquiry => <StatusBadge status={inquiry.status} /> },
        { key: 'action', label: '', render: inquiry => <Link aria-label={`Open ${inquiry.eventName || `inquiry ${inquiry.id}`}`} to={`/coordinator/inquiries/${inquiry.id}`} className="gap-1.5">Open<ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" /></Link> },
      ]} data={page.rows} /> : <EmptyState title={inquiries.length ? 'No matching inquiries' : 'New inquiries will appear here'} description={inquiries.length ? 'Try another name, stage or date. You can also clear the filters.' : 'Client requests will be ready for a coordinator to claim and review.'} actionText={inquiries.length ? 'Clear filters' : undefined} actionOnClick={clear} />}
    </section>
    {!loading && !error && <EventPageControls page={page} onChange={setPageNumber} noun="inquiries" />}
  </div></Layout>;
}
