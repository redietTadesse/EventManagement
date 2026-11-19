import { Dialog } from '@headlessui/react';
import { BuildingOffice2Icon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { seatingCapacity, proposedWindow } from '../utils/proposalBuilder';
import { proposalLabel, proposalDateRange } from '../utils/proposalReview';

export default function VenueComparisonDialog({ open, onClose, venues, plan, onChoose, actionLabel = 'Use this room' }) {
  const setupAgreed = plan.tableSetup && plan.tableSetup !== 'UNDECIDED';
  return <Dialog open={open} onClose={onClose} className="relative z-[80]">
    <div className="composer-dialog-backdrop" aria-hidden="true" /><div className="composer-dialog-scroll"><Dialog.Panel className="room-comparison-dialog">
      <header><div><p className="eyebrow">Make the trade-off visible</p><Dialog.Title>Compare the spaces</Dialog.Title><p>{setupAgreed ? 'Capacity is specific to the selected seating arrangement.' : 'Room maximums are shown. Agree a seating arrangement to confirm how many guests fit.'}</p></div><button type="button" aria-label="Close room comparison" onClick={onClose}><XMarkIcon /></button></header>
      <div className="room-comparison-grid">{venues.map(venue => {
        const seats = setupAgreed ? seatingCapacity(venue, plan.tableSetup) : venue.capacity;
        const reservation = proposedWindow(plan, venue, plan.eventType);
        return <article key={venue.id}><BuildingOffice2Icon /><h3>{venue.name}</h3><dl>
          <div><dt>{setupAgreed ? proposalLabel(plan.tableSetup) + ' capacity' : 'Room maximum; layout not yet agreed'}</dt><dd>{seats ?? 'Not confirmed'}</dd></div>
          <div><dt>Seats above your guest count</dt><dd>{!setupAgreed || seats == null || !plan.expectedAttendees ? 'Choose a layout and guest count first' : seats - Number(plan.expectedAttendees)}</dd></div>
          <div><dt>Full venue window</dt><dd>{reservation ? reservation.days + ' days · ' + proposalDateRange({ eventDate: reservation.from, endDate: reservation.through }) : 'Add dates to check the full window'}</dd></div>
          <div><dt>Facilities recorded by AICC</dt><dd>{venue.resources || 'Not recorded'}</dd></div>
          <div><dt>About the space</dt><dd>{venue.description || 'Ask your coordinator for more information.'}</dd></div>
        </dl><button type="button" className="btn-primary" onClick={() => onChoose(venue)}>{actionLabel}<CheckIcon /></button></article>;
      })}</div>
    </Dialog.Panel></div>
  </Dialog>;
}
