import { CheckIcon } from '@heroicons/react/24/outline';
import { bookingProgress } from '../coordinator/bookingWorkspaceModel';

export default function BookingProgress({ inquiry, contract, onStep }) {
  const stages = bookingProgress(inquiry, contract);
  return <section className="booking-progress" aria-label="Booking progress">
    <div className="booking-progress-heading"><span>Request to reservation</span><span>Booking and event preparation are separate</span></div>
    <ol>{stages.map((stage, index) => <li key={stage.id} className={`booking-stage is-${stage.state}`} aria-current={stage.state === 'current' ? 'step' : undefined}>
      <button type="button" onClick={() => onStep(stage.id)} className="booking-stage-button">
        <span className="booking-stage-number" aria-hidden="true">{stage.state === 'complete' ? <CheckIcon className="h-4 w-4" /> : String(index + 1).padStart(2, '0')}</span>
        <span><strong>{stage.label}</strong><small>{stage.detail}</small><span className="sr-only">{stage.state}</span></span>
      </button>
    </li>)}</ol>
  </section>;
}
