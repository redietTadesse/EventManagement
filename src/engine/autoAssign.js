import { hasConflict } from './conflict';

// Pass eventCategoryMap from utils/constants when calling this helper.
// findBestVendor: picks active vendor with fewest assignments, no conflict
export const findBestVendor = (category, eventDate, vendors, assignments, excludeVendorId) => {
  const candidates = vendors.filter(v =>
    v.serviceCategory === category &&
    v.isActive &&
    v.id !== excludeVendorId &&
    !hasConflict(v.id, eventDate, assignments, {})
  );
  // Count active assignments per vendor
  const loadMap = {};
  assignments.filter(a => a.status === 'ACCEPTED').forEach(a => {
    loadMap[a.vendorId] = (loadMap[a.vendorId] || 0) + 1;
  });
  candidates.sort((a, b) => {
    const loadA = loadMap[a.id] || 0;
    const loadB = loadMap[b.id] || 0;
    if (loadA !== loadB) return loadA - loadB;
    return b.rating - a.rating; // tie-breaker
  });
  return candidates[0] || null;
};

export const autoAssignVendors = (event, eventDate, vendors, existingAssignments, eventCategoryMap) => {
  const requiredCategories = eventCategoryMap[event.eventType] || [];
  const newAssignments = [];
  const unfilled = [];

  requiredCategories.forEach(cat => {
    const vendor = findBestVendor(cat, eventDate, vendors, existingAssignments, null);
    if (vendor) {
      const maxId = existingAssignments.reduce((max, a) => Math.max(max, a.id || 0), 0);
      newAssignments.push({
        id: maxId + newAssignments.length + 1,
        eventId: event.id,
        eventName: event.name,
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        serviceCategory: cat,
        status: 'PENDING',
        assignedAt: new Date().toISOString(),
        respondedAt: null,
        declineReason: null,
      });
    } else {
      unfilled.push(cat);
    }
  });

  const updatedEvent = {
    ...event,
    unfilledCategories: unfilled.length > 0 ? unfilled : undefined,
    status: unfilled.length > 0 ? 'NEEDS_COORDINATOR' : event.status,
  };
  return { assignments: newAssignments, event: updatedEvent, unfilled };
};
