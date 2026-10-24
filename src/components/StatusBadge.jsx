import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function StatusBadge({ status, size = 'md', showIcon = false }) {
  // Semantic color palette
  const colors = {
    // Success (Emerald) - resolved, safe, no action needed
    PROPOSAL_ACCEPTED: 'bg-emerald-100 text-emerald-700',
    ACCEPTED: 'bg-emerald-100 text-emerald-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',

    // Pending (Amber) - waiting for response
    INQUIRY_SUBMITTED: 'bg-amber-100 text-amber-700',
    PROPOSAL_SENT: 'bg-amber-100 text-amber-700',
    PENDING: 'bg-amber-100 text-amber-700',
    AWAITING_VENDORS: 'bg-amber-100 text-amber-700',

    // Warning (Orange) - needs attention within bounded time
    OPEN: 'bg-orange-100 text-orange-700',

    // Critical (Rose) - blocked, requires coordinator intervention
    NEEDS_COORDINATOR: 'bg-rose-100 text-rose-700',
    DECLINED: 'bg-rose-100 text-rose-700',
    PROPOSAL_REJECTED: 'bg-rose-100 text-rose-700',

    // Neutral (Slate) - closed, archived, cancelled
    EVENT_CREATED: 'bg-slate-100 text-slate-700',
    CANCELLED: 'bg-slate-100 text-slate-700',
    CLOSED: 'bg-slate-100 text-slate-700',

    // Info (Sky) - informational
    // Add any informational states here
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const iconMap = {
    NEEDS_COORDINATOR: <ExclamationTriangleIcon className="w-3 h-3" />,
    DECLINED: <ExclamationTriangleIcon className="w-3 h-3" />,
    PROPOSAL_REJECTED: <ExclamationTriangleIcon className="w-3 h-3" />,
    OPEN: <ClockIcon className="w-3 h-3" />,
    PENDING: <ClockIcon className="w-3 h-3" />,
    AWAITING_VENDORS: <ClockIcon className="w-3 h-3" />,
    PROPOSAL_SENT: <ClockIcon className="w-3 h-3" />,
    ACCEPTED: <CheckCircleIcon className="w-3 h-3" />,
    CONFIRMED: <CheckCircleIcon className="w-3 h-3" />,
    COMPLETED: <CheckCircleIcon className="w-3 h-3" />,
    PROPOSAL_ACCEPTED: <CheckCircleIcon className="w-3 h-3" />,
  };

  const label = status?.replace(/_/g, ' ') || status;
  const colorClass = colors[status] || 'bg-slate-100 text-slate-700';
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const icon = showIcon ? iconMap[status] : null;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colorClass} ${sizeClass}`}>
      {icon}
      {label}
    </span>
  );
}