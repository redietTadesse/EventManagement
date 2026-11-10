import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import StatusBadge from '../components/StatusBadge';
import { formatEventDate } from './eventDetailModel';

export default function OperationsQueue({ items, loading, incomplete }) {
  return <section aria-labelledby="operations-queue-title" className="overflow-hidden rounded-2xl border border-[#38605b] bg-[#142f32] text-white shadow-sm">
    <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-5 sm:px-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#efd392]">Coordinator workspace</p>
        <h2 id="operations-queue-title" className="mt-1 text-xl font-semibold sm:text-2xl">What needs attention</h2>
        <p className="mt-1 text-sm text-emerald-50/85">Review exceptions, follow up on inquiries, and check pending offers.</p>
      </div>
      <Link to="/coordinator/events" className="text-sm font-semibold text-emerald-100 hover:underline">All events <span aria-hidden="true">→</span></Link>
    </div>
    {items.length > 0 && <ul className="divide-y divide-white/15 border-t border-white/15 bg-[#1a3a3c]">
      {items.slice(0, 6).map(item => <li key={item.id}>
        <Link to={item.href} className="grid gap-2 px-5 py-4 hover:bg-white/5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-semibold">{item.title || 'Untitled record'}</p>
              {item.status && <StatusBadge status={item.status} />}
            </div>
            <p className="mt-1 text-sm text-emerald-50/85">{item.date && `${formatEventDate(item.date)} · `}{item.detail}</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#efd392]">
            {item.action} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      </li>)}
    </ul>}
    {loading || incomplete || items.length === 0 ? <p role="status" className="border-t border-white/15 px-5 py-3 text-sm text-emerald-50/85 sm:px-6">
      {incomplete ? 'Some records could not be refreshed.' : loading ? 'Checking for work that needs attention…' : 'There are no open exceptions, pending offers, or inquiries to review.'}
    </p> : null}
  </section>;
}
