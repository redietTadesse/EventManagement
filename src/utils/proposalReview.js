const has = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

export function readProposal(value) {
  try {
    const result = typeof value === 'string' ? JSON.parse(value) : value;
    return result && typeof result === 'object' && !Array.isArray(result) ? result : null;
  } catch { return null; }
}

export function proposalLabel(value) {
  if (value == null || value === '') return 'Not recorded';
  const text = String(value).replaceAll('_', ' ').toLowerCase();
  const labels = { av: 'Audiovisual', tv: 'TV', u_shape: 'U shape', undecided: 'To be agreed' };
  return labels[String(value).toLowerCase()] || text.charAt(0).toUpperCase() + text.slice(1);
}

export function proposalMoney(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? `ETB ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'Not recorded';
}

export function proposalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Not recorded';
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return 'Not recorded';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function proposalDateRange(proposal) {
  if (!proposal?.eventDate) return 'Not recorded';
  const start = proposalDate(proposal.eventDate);
  return proposal.endDate && proposal.endDate !== proposal.eventDate
    ? `${start} – ${proposalDate(proposal.endDate)}` : start;
}

export function proposalVendors(proposal) {
  const value = proposal?.vendorShortlist;
  const groups = Array.isArray(value) ? value : value && typeof value === 'object'
    ? Object.entries(value).map(([category, vendors]) => ({ category, vendors })) : [];
  return groups.filter(group => group && typeof group.category === 'string').map(group => ({
    category: group.category,
    vendors: (Array.isArray(group.vendors) ? group.vendors : []).filter(vendor => vendor != null).map(vendor => {
      if (typeof vendor === 'object') return {
        id: vendor.id ?? vendor.vendorId,
        name: vendor.companyName || vendor.vendorName || `Vendor #${vendor.id ?? vendor.vendorId ?? '?'}`,
        ...(Number.isFinite(vendor.rating) ? { rating: vendor.rating } : {}),
        ...(vendor.description ? { description: vendor.description } : {}),
      };
      return { id: typeof vendor === 'number' ? vendor : undefined, name: typeof vendor === 'number' ? `Vendor #${vendor}` : String(vendor) };
    }),
  })).filter(group => group.vendors.length);
}

export function savedProposalVersions(revisions, currentVersion) {
  return (Array.isArray(revisions) ? revisions : []).filter(revision =>
    Number.isInteger(Number(revision?.revisionNumber)) && Number(revision.revisionNumber) > 0
    && Number(revision.revisionNumber) < Number(currentVersion)
  ).sort((a, b) => Number(b.revisionNumber) - Number(a.revisionNumber));
}

const text = value => String(value ?? '').replace(/\r\n/g, '\n').trim();
const categories = proposal => [...new Set(proposal.categories.map(category => text(category).toLowerCase()))].sort();
const vendorKey = proposal => proposalVendors(proposal).map(group => ({
  category: text(group.category).toLowerCase(),
  // Order within a service matters: the first preferred vendor is tried first.
  vendors: group.vendors.map(vendor => vendor.id != null ? `id:${vendor.id}` : `name:${text(vendor.name).toLowerCase()}`),
})).sort((a, b) => a.category.localeCompare(b.category));
const recorded = (proposal, key) => has(proposal, key) && proposal[key] != null && proposal[key] !== '';
const listText = proposal => proposal.categories.length ? proposal.categories.map(proposalLabel).join(', ') : 'No services selected';
const vendorsText = proposal => proposalVendors(proposal).map(group => `${proposalLabel(group.category)}: ${group.vendors.map(vendor => vendor.name).join(', ')}`).join('\n') || 'No vendors suggested';

const fields = [
  { key: 'eventName', label: 'Event name' },
  { key: 'eventType', label: 'Event type', format: proposal => proposalLabel(proposal.eventType) },
  { key: 'venue', label: 'Venue', value: (proposal, other) => recorded(proposal, 'venueId') && recorded(other, 'venueId') ? [String(proposal.venueId), text(proposal.venue)] : text(proposal.venue), format: proposal => proposal.venue },
  { key: 'eventDate', label: 'Event dates', value: proposal => [proposal.eventDate, proposal.endDate || proposal.eventDate], format: proposalDateRange },
  { key: 'expectedAttendees', label: 'Attendance', value: proposal => Number(proposal.expectedAttendees), format: proposal => `${Number(proposal.expectedAttendees).toLocaleString('en-US')} guests` },
  { key: 'tableSetup', label: 'Seating setup', format: proposal => proposalLabel(proposal.tableSetup) },
  { key: 'price', label: 'Quoted total', valid: proposal => recorded(proposal, 'price') && Number.isFinite(Number(proposal.price)), value: proposal => Number(proposal.price), format: proposal => proposalMoney(proposal.price) },
  { key: 'categories', label: 'Included services', valid: proposal => Array.isArray(proposal.categories), value: categories, format: listText },
  { key: 'vendorShortlist', label: 'Suggested vendors', valid: proposal => proposal.vendorShortlist != null && typeof proposal.vendorShortlist === 'object', value: vendorKey, format: vendorsText },
  { key: 'pricingTier', label: 'Package', format: proposal => proposalLabel(proposal.pricingTier) },
  { key: 'terms', label: 'Terms and conditions' },
];

export function compareProposals(currentValue, previousValue) {
  const current = readProposal(currentValue);
  const previous = readProposal(previousValue);
  if (!current || !previous) return { available: false, changes: [], missing: [] };
  const changes = [];
  const missing = [];
  let compared = 0;
  for (const field of fields) {
    const valid = field.valid || (proposal => recorded(proposal, field.key));
    if (!valid(current) || !valid(previous)) {
      if (has(current, field.key) || has(previous, field.key)) missing.push(field.label);
      continue;
    }
    compared += 1;
    const value = field.value || (proposal => text(proposal[field.key]));
    if (JSON.stringify(value(current, previous)) === JSON.stringify(value(previous, current))) continue;
    const format = field.format || (proposal => text(proposal[field.key]));
    changes.push({ key: field.key, label: field.label, before: format(previous), after: format(current) });
  }
  const priceChanged = changes.some(change => change.key === 'price');
  const priceDelta = priceChanged && Number.isFinite(Number(current.price)) && Number.isFinite(Number(previous.price))
    ? Number(current.price) - Number(previous.price) : null;
  return { available: compared > 0, changes, missing, priceDelta };
}
