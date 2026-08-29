import React from 'react';

const statusMap = {
  INQUIRY_SUBMITTED: 'badge-ice',
  PROPOSAL_SENT: 'badge-amber',
  PROPOSAL_ACCEPTED: 'badge-green',
  PROPOSAL_REJECTED: 'badge-rose',
  EVENT_CREATED: 'badge-navy',
  AWAITING_VENDORS: 'badge-amber',
  CONFIRMED: 'badge-green',
  COMPLETED: 'badge-gray',
  CANCELLED: 'badge-rose',
  CLOSED: 'badge-gray',
  PENDING: 'badge-amber',
  ACCEPTED: 'badge-green',
  DECLINED: 'badge-rose',
  NEEDS_COORDINATOR: 'badge-rose',
};

const StatusBadge = ({ status }) => {
  const cls = statusMap[status] || 'badge-gray';
  const label = status.replace(/_/g, ' ');
  return <span className={`badge ${cls}`}>{label}</span>;
};

export default StatusBadge;