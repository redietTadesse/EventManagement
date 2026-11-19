import { proposalDraft } from './proposals.js';

export const SEATING = [['THEATRE', 'Theatre'], ['CLASSROOM', 'Classroom'], ['BANQUET', 'Banquet'], ['CABARET', 'Cabaret'], ['BOARDROOM', 'Boardroom'], ['U_SHAPE', 'U-shape']];
export function seatingCapacity(venue, setup) {
  if (!venue || !setup || setup === 'UNDECIDED') return null;
  if (!venue.layoutCapacities) return setup === 'THEATRE' && Number.isInteger(venue.capacity) ? venue.capacity : null;
  try {
    const layouts = typeof venue.layoutCapacities === 'string' ? JSON.parse(venue.layoutCapacities) : venue.layoutCapacities;
    const capacity = layouts?.[setup];
    return Number.isInteger(capacity) && capacity > 0 ? capacity : null;
  } catch { return null; }
}
const dateValid = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const shift = (value, days) => new Date(Date.parse(value) + days * 86400000).toISOString().slice(0, 10);
export function proposedWindow(draft, venue, type) {
  if (!venue || !dateValid(draft.eventDate) || !dateValid(draft.endDate || draft.eventDate) || draft.endDate && draft.endDate < draft.eventDate) return null;
  const setup = type === 'meeting' ? 1 : Math.max(0, Number(venue.setupBufferDays) || 0);
  const takedown = type === 'meeting' ? 1 : Math.max(0, Number(venue.teardownBufferDays) || 0);
  const from = shift(draft.eventDate, -setup);
  let through = shift(draft.endDate || draft.eventDate, takedown);
  if (['exhibition', 'trade_show'].includes(type) && through < shift(from, 6)) through = shift(from, 6);
  return { from, through, days: Math.round((Date.parse(through) - Date.parse(from)) / 86400000) + 1 };
}
export function initialProposalDraft(inquiry, editMode) {
  let proposal = {};
  if (editMode) { try { proposal = typeof inquiry.proposal === 'string' ? JSON.parse(inquiry.proposal) : inquiry.proposal || {}; } catch { /* Keep the editable inquiry brief. */ } }
  return {
    ...proposalDraft(proposal),
    eventName: proposal.eventName ?? inquiry.eventName ?? '',
    eventDate: proposal.eventDate || inquiry.eventDate || '',
    endDate: proposal.endDate || inquiry.endDate || '',
    expectedAttendees: proposal.expectedAttendees ?? inquiry.expectedAttendees ?? '',
    tableSetup: proposal.tableSetup || inquiry.tableSetup || 'UNDECIDED',
    categories: Array.isArray(proposal.categories) ? [...proposal.categories] : Array.isArray(inquiry.requestedCategories) ? [...inquiry.requestedCategories] : [],
  };
}
export function proposalChecks(draft, venue, { loading, error, checked, earliestDate } = {}) {
  const issues = {};
  if (!draft.eventName?.trim()) issues.eventName = 'Give the event a name.';
  if (!dateValid(draft.eventDate) || earliestDate && draft.eventDate < earliestDate) issues.eventDate = 'Choose a future event date.';
  if (draft.endDate && (!dateValid(draft.endDate) || draft.endDate < draft.eventDate)) issues.endDate = 'The end date must be on or after the start date.';
  if (!Number.isInteger(Number(draft.expectedAttendees)) || Number(draft.expectedAttendees) < 1 || Number(draft.expectedAttendees) > 2147483647) issues.expectedAttendees = 'Enter a whole number of guests, at least one.';
  if (!SEATING.some(([key]) => key === draft.tableSetup)) issues.tableSetup = 'Agree a seating setup before sending.';
  const capacity = seatingCapacity(venue, draft.tableSetup);
  if (loading) issues.venue = 'Wait for the availability check.';
  else if (error || !checked) issues.venue = 'Check venue availability before sending.';
  else if (!venue) issues.venue = 'Choose an available venue.';
  else if (capacity == null) issues.venue = 'Capacity for this seating setup has not been confirmed.';
  else if (Number(draft.expectedAttendees) > capacity) issues.venue = `This setup seats ${capacity}; reduce attendance or choose another room.`;
  if (!Number.isInteger(Number(draft.customPrice)) || Number(draft.customPrice) < 1 || Number(draft.customPrice) > 2147483647) issues.customPrice = 'Enter the agreed total in whole ETB, greater than zero.';
  if (!draft.terms?.trim()) issues.terms = 'Add the terms the client will review.';
  return issues;
}
export function proposalPayload(draft, venue, expectedVersion) {
  return {
    venue: venue.name, venueId: venue.id,
    venueDetails: JSON.stringify({ id: venue.id, name: venue.name, capacity: seatingCapacity(venue, draft.tableSetup), location: venue.location }),
    price: Number(draft.customPrice), terms: draft.terms.trim(), pricingTier: draft.pricingTier,
    categories: [...draft.categories], eventName: draft.eventName.trim(), eventDate: draft.eventDate,
    endDate: draft.endDate || draft.eventDate, expectedAttendees: Number(draft.expectedAttendees), tableSetup: draft.tableSetup, expectedVersion,
    vendorShortlist: Object.fromEntries(Object.entries(draft.vendorShortlist || {}).filter(([category]) => draft.categories.includes(category))
      .map(([category, ids]) => [category, [...new Set(ids.map(Number).filter(id => Number.isSafeInteger(id) && id > 0))]]).filter(([, ids]) => ids.length)),
  };
}
