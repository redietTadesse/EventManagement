import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const labels = {
  INQUIRY_SUBMITTED: 'Inquiry received', PROPOSAL_SENT: 'Proposal sent', PROPOSAL_ACCEPTED: 'Proposal accepted',
  PROPOSAL_REJECTED: 'Proposal declined', EVENT_CREATED: 'Event created', AWAITING_VENDORS: 'Awaiting vendors',
  NEEDS_COORDINATOR: 'Needs attention', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  CLOSED: 'Closed', ACCEPTED: 'Accepted', PENDING: 'Response pending', DECLINED: 'Declined', EXPIRED: 'Expired',
  OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved',
};
const success = new Set(['ACCEPTED', 'PROPOSAL_ACCEPTED', 'CONFIRMED', 'COMPLETED', 'RESOLVED']);
const critical = new Set(['NEEDS_COORDINATOR', 'DECLINED', 'PROPOSAL_REJECTED']);
const pending = new Set(['PENDING', 'AWAITING_VENDORS', 'PROPOSAL_SENT', 'INQUIRY_SUBMITTED', 'OPEN', 'IN_PROGRESS']);

export default function StatusBadge({ status, size = 'md', showIcon = false }) {
  const tone = success.has(status) ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/15'
    : critical.has(status) ? 'bg-rose-50 text-rose-800 ring-rose-600/15'
    : pending.has(status) ? 'bg-amber-50 text-amber-800 ring-amber-600/15'
    : 'bg-slate-100 text-slate-600 ring-slate-600/10';
  const Icon = success.has(status) ? CheckCircleIcon : critical.has(status) ? ExclamationTriangleIcon : ClockIcon;
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${tone} ${size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-1 text-[11px]'}`}>
      {showIcon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-65" aria-hidden="true" />}
      {labels[status] || status?.replaceAll('_', ' ').toLowerCase() || 'Unknown'}
    </span>
  );
}
