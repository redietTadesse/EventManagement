import { proposedWindow } from '../utils/proposalBuilder.js';
import { proposalTerms } from './bookingWorkspaceModel.js';

// Compare proposals before conversion. The reservation service remains the source of availability.
export function proposalOverlaps(inquiries, venues, today) {
  const rooms = new Map(venues.map(room => [String(room.id), room]));
  const byRoom = new Map();
  let skipped = 0;
  for (const inquiry of inquiries) {
    if (inquiry.event || !['PROPOSAL_SENT', 'PROPOSAL_ACCEPTED'].includes(inquiry.status)) continue;
    const terms = proposalTerms(inquiry);
    const room = rooms.get(String(terms.venueId));
    const dates = {
      eventDate: terms.eventDate || inquiry.eventDate,
      endDate: terms.endDate || inquiry.endDate,
    };
    const window = proposedWindow(dates, room, inquiry.eventType?.toLowerCase());
    if (!window) { skipped++; continue; }
    if (window.through < today) continue;
    if (!byRoom.has(room.id)) byRoom.set(room.id, []);
    byRoom.get(room.id).push({ inquiry, room, ...window });
  }
  const pairs = [];
  for (const rows of byRoom.values()) {
    rows.sort((a, b) => a.from.localeCompare(b.from) || a.inquiry.id - b.inquiry.id);
    for (let left = 0; left < rows.length; left++) {
      const first = rows[left];
      for (let right = left + 1; right < rows.length && rows[right].from <= first.through; right++) {
        const second = rows[right];
        const through = first.through < second.through ? first.through : second.through;
        if (through >= today) pairs.push({ first, second, from: second.from, through });
      }
    }
  }
  return { pairs: pairs.sort((a, b) => a.from.localeCompare(b.from)), skipped };
}
