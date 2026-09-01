export default function StatusBadge({ status }) {
  const colors = {
    INQUIRY_SUBMITTED: 'bg-blue-100 text-blue-700',
    PROPOSAL_SENT: 'bg-yellow-100 text-yellow-700',
    PROPOSAL_ACCEPTED: 'bg-green-100 text-green-700',
    PROPOSAL_REJECTED: 'bg-red-100 text-red-700',
    EVENT_CREATED: 'bg-indigo-100 text-indigo-700',
    AWAITING_VENDORS: 'bg-purple-100 text-purple-700',
    NEEDS_COORDINATOR: 'bg-red-100 text-red-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
    CLOSED: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    DECLINED: 'bg-red-100 text-red-700',
  };

  const label = status?.replace(/_/g, ' ') || status;

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}