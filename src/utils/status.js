export const STATUS_LABELS = {
  INQUIRY_SUBMITTED: 'New inquiry', PROPOSAL_SENT: 'Proposal to review', PROPOSAL_ACCEPTED: 'Proposal agreed',
  PROPOSAL_REJECTED: 'Proposal declined', EVENT_CREATED: 'Event created', AWAITING_VENDORS: 'Waiting for vendors',
  NEEDS_COORDINATOR: 'Needs coordinator', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  CLOSED: 'Closed', ACCEPTED: 'Accepted', PENDING: 'Reply needed', DECLINED: 'Declined', EXPIRED: 'Expired',
  OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved',
};
export const statusLabel = status => STATUS_LABELS[status] || status?.replaceAll('_', ' ').toLowerCase() || 'Unknown';
