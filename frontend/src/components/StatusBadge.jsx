import React from 'react';

const statusColors = {
  INQUIRY_SUBMITTED: 'bg-blue-100 text-blue-700',
  PROPOSAL_SENT: 'bg-amber-100 text-amber-700',
  PROPOSAL_ACCEPTED: 'bg-green-100 text-green-700',
  PROPOSAL_REJECTED: 'bg-rose-100 text-rose-700',
  EVENT_CREATED: 'bg-indigo-100 text-indigo-700',
  AWAITING_VENDORS: 'bg-purple-100 text-purple-700',
  NEEDS_COORDINATOR: 'bg-rose-200 text-rose-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-slate-200 text-slate-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
  CLOSED: 'bg-slate-200 text-slate-700',
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-rose-100 text-rose-700',
};

export default function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ') || status || 'Unknown';
  const colorClass = statusColors[status] || 'bg-slate-200 text-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}