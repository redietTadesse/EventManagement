export const lifecycleStages = [
  { label: 'Inquiry & proposal', statuses: ['INQUIRY_SUBMITTED', 'PROPOSAL_SENT', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED'] },
  { label: 'Event preparation', statuses: ['EVENT_CREATED'] },
  { label: 'Vendor coordination', statuses: ['AWAITING_VENDORS', 'NEEDS_COORDINATOR'] },
  { label: 'Confirmed', statuses: ['CONFIRMED'] },
  { label: 'Closed / completed', statuses: ['COMPLETED', 'CLOSED', 'CANCELLED'] },
];

export function makeDateRange(today, days) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  const dateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { startDate: dateString(start), endDate: dateString(end) };
}

export function createRequestTracker() {
  let latestId = 0;
  return {
    begin: () => ++latestId,
    isLatest: (id) => id === latestId,
    invalidate: () => { latestId += 1; },
  };
}

export function mergeDashboardResults(results, previousData, previouslyLoaded) {
  const keys = ['stats', 'exceptions', 'history', 'inquiries', 'events'];
  const updates = {};
  const loaded = {};
  const errors = {};
  results.forEach((result, index) => {
    const key = keys[index];
    if (result.status === 'fulfilled') {
      updates[key] = (key === 'history' || key === 'inquiries' || key === 'events') ? result.value || [] : result.value;
      loaded[key] = true;
    } else {
      errors[key] = result.reason?.response?.data?.message || result.reason?.message || 'Could not load this section.';
    }
  });
  return { data: { ...previousData, ...updates }, loaded: { ...previouslyLoaded, ...loaded }, errors };
}

export function metricDisplay(value, loaded) {
  return loaded ? value : '—';
}

export function buildAttentionItems(exceptions = {}, inquiries = []) {
  const openAssignments = exceptions.openAssignments || [];
  const assignmentsByEvent = new Set(openAssignments.map((assignment) => String(assignment.eventId)));
  const items = [
    ...(exceptions.needsCoordinatorEvents || [])
      .filter((event) => !assignmentsByEvent.has(String(event.id)))
      .map((event) => ({ id: `event:${event.id}:intervention`, title: event.name, detail: 'Coordinator intervention required', href: `/coordinator/events/${event.id}`, priority: 0, time: event.updatedAt || event.createdAt })),
    ...openAssignments.map((assignment) => ({ id: `assignment:${assignment.id}`, title: assignment.serviceCategory || 'Open vendor assignment', detail: assignment.eventName || 'Unclaimed assignment', href: `/coordinator/events/${assignment.eventId}`, priority: 0, time: assignment.createdAt })),
    ...(exceptions.staleProposals || []).map((inquiry) => ({ id: `inquiry:${inquiry.id}:stale-proposal`, title: inquiry.clientName || inquiry.eventType, detail: 'Proposal awaiting follow-up', href: `/coordinator/inquiries/${inquiry.id}`, priority: 1, time: inquiry.updatedAt || inquiry.createdAt })),
    ...inquiries.filter((inquiry) => inquiry.status === 'INQUIRY_SUBMITTED')
      .map((inquiry) => ({ id: `inquiry:${inquiry.id}`, title: inquiry.clientName, detail: `${inquiry.eventType} inquiry awaiting review`, href: `/coordinator/inquiries/${inquiry.id}`, priority: 2, time: inquiry.createdAt })),
  ];
  const unique = new Map();
  for (const item of items.sort((left, right) => left.priority - right.priority)) {
    const canonicalId = item.id.startsWith('inquiry:') ? item.id.split(':').slice(0, 2).join(':') : item.id;
    if (!unique.has(canonicalId)) unique.set(canonicalId, { ...item, id: canonicalId });
  }
  return [...unique.values()].sort((left, right) => left.priority - right.priority || new Date(left.time || 0) - new Date(right.time || 0));
}

export function countLifecycleStages(statusCounts) {
  return lifecycleStages.map((stage) => ({
    ...stage,
    count: stage.statuses.reduce((sum, status) => sum + Number(statusCounts[status] || 0), 0),
  }));
}
