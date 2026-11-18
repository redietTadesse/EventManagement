import { CheckIcon } from '@heroicons/react/24/solid';

export default function EventTimeline({ timeline, status, proposalAccepted }) {
  if (!timeline) return null;
  const stopped = ['PROPOSAL_REJECTED', 'CLOSED', 'CANCELLED'].includes(status);
  const steps = [
    ['Inquiry received', timeline.inquirySubmitted],
    ['Proposal sent', timeline.proposalSent],
    ['Proposal accepted', proposalAccepted],
    ['Venue booked', timeline.venueHeld, timeline.venueName],
    ['Vendors confirmed', timeline.vendorsConfirmed],
    ['Event confirmed', timeline.eventConfirmed],
  ];
  const next = stopped || timeline.eventConfirmed ? -1 : steps.findIndex(([, done]) => !done);

  return <section className="border-t border-white/15 bg-[#1a3a3c] p-5 sm:p-7" aria-label="Event progress">
    <h3 className="text-sm font-semibold text-emerald-50">Booking milestones</h3>
    <ol className="mt-3 grid gap-2 sm:grid-cols-3">
      {steps.map(([label, done, detail], index) => (
        <li key={label} aria-current={index === next ? 'step' : undefined}
          className={`flex items-start gap-2 rounded-xl border p-3 ${done ? 'border-emerald-100 bg-emerald-50' : index === next ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? 'bg-emerald-700 text-white' : 'bg-white text-slate-700'}`} aria-hidden="true">
            {done ? <CheckIcon className="h-4 w-4" /> : index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900">{label}</p>
            <p className="mt-1 text-[11px] text-slate-600">{done ? detail || 'Done' : index === next ? 'In progress' : stopped || timeline.eventConfirmed ? 'Not recorded' : 'Pending'}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>;
}
