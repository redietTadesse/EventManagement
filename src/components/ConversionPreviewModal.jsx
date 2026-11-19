import { Dialog } from '@headlessui/react';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { proposalLabel, proposalDate } from '../utils/proposalReview';
const percent = value => Number.isFinite(value) ? Math.round(value * 100) + '%' : 'Not recorded';

export default function ConversionPreviewModal({ preview, onCancel }) {
  if (!preview) return null;
  const categories = preview.categories || [];
  const gaps = categories.filter(category => !category.candidates?.length);
  const venue = preview.venue;
  return <Dialog open onClose={onCancel} className="relative z-[80]">
    <div className="composer-dialog-backdrop" aria-hidden="true" /><div className="composer-dialog-scroll"><Dialog.Panel className="recovery-desk booking-checks">
      <header className="recovery-header"><div><p className="eyebrow">Review before booking</p><Dialog.Title>What still needs attention?</Dialog.Title><p>{proposalLabel(preview.eventType)} · {proposalDate(preview.eventDate)} · {preview.expectedAttendees} guests</p></div><button type="button" aria-label="Close booking checks" onClick={onCancel}><XMarkIcon /></button></header>
      <div className="recovery-notice"><CheckCircleIcon /><p>This is a <strong>read-only check</strong>. It creates no reservation or vendor offer. The signed contract and receipt review remain separate booking steps.</p></div>
      <div className="booking-checks-body"><section className={'booking-check-venue ' + (venue?.available ? 'is-clear' : 'needs-attention')}>
        {venue?.available ? <CheckCircleIcon /> : <ExclamationTriangleIcon />}<div><p className="eyebrow">Venue check</p><h3>{venue?.venueName || 'No venue selected'}</h3><p>{venue?.message || 'Choose and agree a venue with the client.'}</p>{venue?.capacity != null && <small>Room maximum: {venue.capacity}. Capacity for the agreed seating setup is shown in the proposal.</small>}{!venue?.available && <p className="booking-check-guidance">Resolve the conflict and agree any revised terms with the client before booking.</p>}{venue?.explanation?.length > 0 && <details><summary>View the venue checks</summary><ul>{venue.explanation.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}</div>
      </section>
      <div className="booking-checks-heading"><div><h3>Service sourcing outlook</h3><p>These are current recommendations, not accepted commitments.</p></div><span>{gaps.length ? gaps.length + ' services need attention' : categories.length ? 'Candidates found for every service' : 'No external services required'}</span></div>
      <div className="booking-check-services">{categories.map(category => <details key={category.category} open={!category.candidates?.length}>
        <summary><span><strong>{proposalLabel(category.category)}</strong><small>{category.candidates?.length ? category.candidates.length + ' ranked candidates shown' : 'No suitable candidates found'}</small></span><span>{category.candidates?.[0]?.companyName || 'Coordinator follow-up needed'}</span></summary>
        {category.warning && <p className="booking-check-warning">{category.warning}</p>}
        {(category.candidates || []).map(candidate => <article key={candidate.vendorId}><div><span className="recovery-rank">#{candidate.rank}</span><strong>{candidate.companyName}</strong><span className="recovery-score"><strong>{percent(candidate.score)}</strong><small>match score</small></span></div><dl><div><dt>Quality</dt><dd>{percent(candidate.qualityScore)}</dd></div><div><dt>Workload factor</dt><dd>{percent(candidate.workloadScore)}</dd></div><div><dt>Rotation</dt><dd>{percent(candidate.rotationScore)}</dd></div><div><dt>Current assignments</dt><dd>{candidate.currentLoad ?? 'Not recorded'}</dd></div></dl></article>)}
        {category.excludedCandidates?.length > 0 && <details className="recovery-excluded"><summary>{category.excludedCandidates.length} excluded candidates</summary><ul>{category.excludedCandidates.map(candidate => <li key={candidate.vendorId}><strong>{candidate.companyName}</strong><p>{candidate.reason}</p></li>)}</ul></details>}
      </details>)}</div>
      <p className="booking-checks-footnote">Recommendations can change. Client preferences and eligibility are checked again before offers are sent. Confirmation depends on actual vendor responses.</p>
      <footer><button type="button" className="btn-outline" onClick={onCancel}>Return to the booking</button></footer></div>
    </Dialog.Panel></div>
  </Dialog>;
}
