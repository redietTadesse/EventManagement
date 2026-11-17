const terminalStatuses = new Set(['CANCELLED', 'COMPLETED', 'CLOSED', 'PROPOSAL_REJECTED']);
const maxRankedBackups = 3;
const manualSelections = new Set(['COORDINATOR_MANUAL', 'COORDINATOR_FORCED', 'POOL_CLAIM']);
const cancellableStatuses = new Set(['AWAITING_VENDORS', 'NEEDS_COORDINATOR', 'CONFIRMED']);

export const serviceLabel = (value = '') => value.toLowerCase() === 'av'
  ? 'AV' : value.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase());

export function eventActions(status, role) {
  return {
    cancel: ['CLIENT', 'COORDINATOR'].includes(role) && cancellableStatuses.has(status),
    complete: ['COORDINATOR', 'ADMIN'].includes(role) && status === 'CONFIRMED',
    reschedule: ['COORDINATOR', 'ADMIN'].includes(role) && Boolean(status) && !terminalStatuses.has(status),
    assign: ['COORDINATOR', 'ADMIN'].includes(role) && Boolean(status) && !terminalStatuses.has(status),
  };
}

export function buildServiceRows(requiredCategories = [], assignments = []) {
  return [...new Set(requiredCategories)].map(category => {
    const attempts = assignments.filter(item => item.serviceCategory === category)
      .sort((a, b) => Number(a.id) - Number(b.id));
    const current = attempts.at(-1) || null;
    const state = ['ACCEPTED', 'COMPLETED'].includes(current?.status)
      ? 'resolved' : current?.status === 'PENDING' ? 'pending' : 'exhausted';
    const manual = manualSelections.has(current?.selectionReason);
    const vendorCount = new Set(attempts.map(item => item.vendorId).filter(id => id != null)).size;
    const backupsUsed = Math.max(0, vendorCount - 1);
    const reasons = {
      OPEN: 'the vendor-pool offer has not been claimed',
      DECLINED: 'the latest vendor offer was declined',
      EXPIRED: 'the latest vendor offer expired',
      CANCELLED: 'the latest vendor offer was cancelled',
    };
    return {
      category, attempts, current, state,
      vendorName: current?.vendorName || 'a vendor',
      backupLabel: state === 'pending' && !manual && backupsUsed > 0 && backupsUsed <= maxRankedBackups
        ? `Backup ${backupsUsed} of ${maxRankedBackups}` : null,
      manual,
      reason: state === 'exhausted' && ['DECLINED', 'EXPIRED'].includes(current?.status)
        ? manual ? 'the follow-up offer ended without acceptance'
          : backupsUsed >= maxRankedBackups ? 'all three automatic backups ended without acceptance'
            : 'no eligible untried vendor remained after the last offer'
        : reasons[current?.status] || 'no active vendor offer exists',
    };
  });
}

export function latestOfferHandoff(rows) {
  const recentRows = [...rows].sort((left, right) =>
    Number(right.state === 'pending') - Number(left.state === 'pending')
    || Number(right.current?.id || 0) - Number(left.current?.id || 0));
  for (const row of recentRows) {
    const previous = row.attempts.at(-2);
    if (row.current?.vendorId != null && previous?.vendorId != null
      && String(previous.vendorId) !== String(row.current.vendorId)
      && ['DECLINED', 'EXPIRED'].includes(previous.status)) {
      return { category: row.category, service: serviceLabel(row.category), previous, current: row.current };
    }
  }
  return null;
}

export function parseSelection(assignment) {
  try {
    const snapshot = typeof assignment?.decisionSnapshot === 'string'
      ? JSON.parse(assignment.decisionSnapshot) : assignment?.decisionSnapshot;
    if (!snapshot || typeof snapshot !== 'object') return { snapshot: null, selected: null };
    const selectedId = snapshot.selectedVendorId ?? assignment.vendorId;
    return {
      snapshot,
      selected: (snapshot.considered || []).find(candidate =>
        selectedId != null && String(candidate.vendorId) === String(selectedId)) || null,
    };
  } catch {
    return { snapshot: null, selected: null };
  }
}

export function getEventStatusReason(status, rows) {
  if (terminalStatuses.has(status)) return `The event is ${serviceLabel(status).toLowerCase()}.`;
  const stuck = rows.filter(row => row.state === 'exhausted');
  const pending = rows.filter(row => row.state === 'pending');
  if (stuck.length) {
    return `${stuck.map(row => `${serviceLabel(row.category)}: ${row.reason}`).join('; ')}. ${pending.length ? `${pending.length} other service ${pending.length === 1 ? 'offer is' : 'offers are'} awaiting a vendor response.` : ''}`.trim();
  }
  if (pending.length) {
    return `${pending.map(row => `${serviceLabel(row.category)} is awaiting ${row.vendorName}`).join('; ')}. Confirmation follows acceptance of every required external service.`;
  }
  if (rows.length) return 'Every required external service has an accepted or completed assignment.';
  return 'No required external vendor services are recorded for this event.';
}

export function nextEventAction({ status, rows, vendorsKnown, venueNeedsAttention, venueKnown, tasksRemaining, tasksKnown }) {
  if (terminalStatuses.has(status)) return {
    kind: 'closed', title: 'This event is closed to operational changes',
    description: getEventStatusReason(status, rows), target: 'history', action: 'View history',
  };
  if (!vendorsKnown) return {
    kind: 'unknown', title: 'Vendor coordination could not be verified',
    description: 'Refresh the event data before deciding whether intervention is needed.', target: 'refresh', action: 'Retry event data',
  };
  const blocked = rows.find(row => row.state === 'exhausted');
  if (blocked) return {
    kind: 'intervene', title: `${serviceLabel(blocked.category)} needs coordinator review`,
    description: `${serviceLabel(blocked.category)}: ${blocked.reason}. Review eligible alternatives and record a reason when assigning a vendor.`,
    category: blocked.category, target: 'vendors', action: 'Review alternatives',
  };
  if (venueNeedsAttention) return {
    kind: 'venue', title: 'The venue reservation needs attention',
    description: 'Check the reservation and availability for the full event date range.', target: 'overview', action: 'Review venue',
  };
  const pending = rows.filter(row => row.state === 'pending');
  if (pending.length) return {
    kind: 'waiting', title: 'Waiting for vendor responses',
    description: `${pending.length} service ${pending.length === 1 ? 'offer is' : 'offers are'} pending. Automatic sourcing tries up to three ranked backups. A coordinator handles the service if the limit is reached or no eligible vendor remains.`,
    target: 'vendors', action: 'View pending offers',
  };
  if (!venueKnown) return {
    kind: 'venue', title: 'Verify the venue reservation',
    description: 'The reservation has not been verified. Check it before treating preparation as complete.', target: 'overview', action: 'Review venue',
  };
  if (!tasksKnown) return {
    kind: 'tasks', title: 'Check preparation tasks', description: 'Task progress is unavailable. Open Tasks to retry.', target: 'tasks', action: 'Review tasks',
  };
  if (tasksRemaining > 0) return {
    kind: 'tasks', title: `${tasksRemaining} preparation ${tasksRemaining === 1 ? 'task remains' : 'tasks remain'}`,
    description: 'Review owners, due dates and prerequisites to finish preparation.', target: 'tasks', action: 'Review tasks',
  };
  return {
    kind: 'ready', title: 'No outstanding vendor offers or preparation tasks',
    description: 'Review the overview before recording event completion when the lifecycle permits it.', target: 'overview', action: 'View overview',
  };
}

export function venueReservation(bookings, eventId, startDate, endDate = startDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate || startDate}T00:00:00Z`);
  const requiredDays = Number.isFinite(start) && Number.isFinite(end) && end >= start
    ? Math.round((end - start) / 86400000) + 1 : null;
  const bookedDates = [...new Set(bookings
    .filter(booking => String(booking.eventId) === String(eventId) && booking.status === 'CONFIRMED' && booking.bookingDate)
    .map(booking => booking.bookingDate))].sort();
  const confirmedDates = bookedDates.filter(date => date >= startDate && date <= (endDate || startDate));
  return { requiredDays, confirmedDates, bookedDates, complete: requiredDays != null && confirmedDates.length === requiredDays };
}

export function formatEventDate(value) {
  if (!value) return 'Date unavailable';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    .format(new Date(year, month - 1, day));
}

export function formatEventRange(start, end) {
  return `${formatEventDate(start)}${end && end !== start ? ` – ${formatEventDate(end)}` : ''}`;
}
