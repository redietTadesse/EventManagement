import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { ArrowRightIcon, CheckIcon, MagnifyingGlassIcon, ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { proposalLabel, proposalDate } from '../utils/proposalReview';
import { recoveryChoice } from '../utils/vendorRecovery';

const percentage = value => Number.isFinite(value) ? Math.round(value * 10) / 10 + '%' : 'Not recorded';
function Factor({ label, weight, value }) {
  return <div className="recovery-factor"><div><span>{label}<small>{weight}% of the match score</small></span><strong>{percentage(value)}</strong></div><div className="recovery-factor-track" aria-hidden="true"><span style={{ width: Number.isFinite(value) ? Math.min(100, Math.max(0, value)) + '%' : '0%' }} /></div></div>;
}

export default function VendorRecoveryDesk({ isOpen, onClose, onAssign, availableVendors = [], excludedVendors = [], serviceCategory, eventName, eventDate, loading = false, loadError = '', submitting = false, error = '' }) {
  const [selectedId, setSelectedId] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [review, setReview] = useState(false);
  useEffect(() => { if (isOpen) { setSelectedId(''); setReason(''); setSearch(''); setReview(false); } }, [isOpen, serviceCategory]);
  const choice = recoveryChoice(availableVendors, selectedId, reason, loading, loadError);
  const vendor = choice.vendor;
  const candidates = availableVendors.filter(item => item.companyName?.toLowerCase().includes(search.toLowerCase()));
  const busy = loading || submitting;
  return <Dialog open={isOpen} onClose={() => { if (!submitting) onClose(); }} className="relative z-[80]">
    <div className="composer-dialog-backdrop" aria-hidden="true" /><div className="composer-dialog-scroll"><Dialog.Panel className="recovery-desk">
      <header className="recovery-header"><div><p className="eyebrow">Resolve a service gap</p><Dialog.Title>{review ? 'Review the replacement offer' : 'Find the right replacement.'}</Dialog.Title><p>{proposalLabel(serviceCategory)}{eventName ? ' · ' + eventName : ''}{eventDate ? ' · ' + proposalDate(eventDate) : ''}</p></div><button type="button" aria-label="Close vendor recovery" disabled={submitting} onClick={onClose}><XMarkIcon /></button></header>
      <div className="recovery-notice"><ShieldCheckIcon /><p>Only eligible candidates are shown. Sending creates a <strong>pending offer</strong>; the vendor must accept before the service is covered.</p></div>
      {error && <p role="alert" className="composer-error">{error}</p>}
      {review ? <div className="recovery-offer-review">
        <span className="composer-draft-tag">Ready for your review</span><h3>{vendor?.companyName || 'Candidate is no longer available'}</h3><p>Recipient of the {proposalLabel(serviceCategory).toLowerCase()} offer</p>
        <dl><div><dt>What happens next</dt><dd>The selected vendor receives an offer and a response deadline. The service remains pending until they accept.</dd></div><div><dt>Your recorded reason</dt><dd>{choice.reason}</dd></div><div><dt>Previous attempts</dt><dd>Earlier declines and expired offers remain in the service history.</dd></div></dl>
        {!choice.ready && <p role="alert" className="composer-error">Eligibility or the selected vendor changed. Go back and review the current candidates.</p>}
        <footer><button type="button" className="btn-outline" disabled={submitting} onClick={() => setReview(false)}>Back to comparison</button><button type="button" className="btn-primary" disabled={!choice.ready || submitting} onClick={() => { if (choice.ready && !submitting) onAssign(String(choice.vendorId), choice.reason); }}>{submitting ? 'Sending offer…' : 'Send pending offer'}<ArrowRightIcon /></button></footer>
      </div> : <div className="recovery-layout"><section className="recovery-candidates" aria-label="Eligible replacement vendors">
        <div className="recovery-list-heading"><h3>Eligible candidates</h3><span>{loading ? 'Checking…' : availableVendors.length + ' available'}</span></div>
        <label className="composer-room-search"><MagnifyingGlassIcon /><span className="sr-only">Find a replacement vendor</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a vendor" disabled={busy} /></label>
        {loading ? <p role="status" className="room-skeleton">Refreshing eligibility for this event…</p> : loadError ? <p role="alert" className="composer-error">{loadError} Close this panel and refresh the event to retry.</p> : <>
          <div className="recovery-vendor-list">{candidates.map(item => {
            const id = item.id ?? item.vendorId; const selected = String(id) === selectedId;
            return <button type="button" key={id} aria-pressed={selected} className={'recovery-vendor ' + (selected ? 'is-selected' : '')} onClick={() => setSelectedId(String(id))}>
              <span className="recovery-rank">{item.rank != null ? '#' + item.rank : '—'}</span><span><strong>{item.companyName}</strong><small>{Number.isFinite(item.rating) && item.rating > 0 ? item.rating.toFixed(1) + ' / 5 rating' : 'No ratings recorded'}</small></span><span className="recovery-score"><strong>{percentage(item.score)}</strong><small>match score</small></span>{selected && <CheckIcon />}
            </button>;
          })}</div>
          {!candidates.length && <div className="composer-empty"><h4>{availableVendors.length ? 'No vendor names match' : 'No eligible replacements right now'}</h4><p>{availableVendors.length ? 'Try another name or clear the search.' : 'Contact procurement to discuss other approved vendors. AICC can activate an approved profile before you try again.'}</p></div>}
          {excludedVendors.length > 0 && <details className="recovery-excluded"><summary>{excludedVendors.length} candidates did not pass the checks</summary><ul>{excludedVendors.map(item => <li key={item.vendorId}><strong>{item.companyName}</strong><p>{item.reason || 'Not eligible for this service and event.'}</p></li>)}</ul></details>}
        </>}
      </section><section className="recovery-evidence" aria-label="Selected vendor and offer reason">
        {vendor ? <><p className="eyebrow">Understand the match</p><h3>{vendor.companyName}</h3><p className="recovery-evidence-intro">{vendor.eligibilityExplanation || 'Passed the current event-specific eligibility checks.'}</p>
          <Factor label="Quality" weight={50} value={vendor.qualityScore} /><Factor label="Capacity for more work" weight={40} value={vendor.workloadScore} /><Factor label="Assignment rotation" weight={10} value={vendor.rotationScore} />
          <p className="recovery-factor-note">These are the backend’s current factor scores. A lower-ranked eligible vendor can still be selected when you record a reason.</p>
        </> : <div className="recovery-pick-prompt"><ShieldCheckIcon /><h3>Compare before committing.</h3><p>Select a vendor to inspect the match factors and prepare a replacement offer.</p></div>}
        <label className="recovery-reason">Why are you choosing this vendor?<textarea rows={4} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy || !vendor} placeholder="e.g. The vendor confirmed the required equipment and can prepare at short notice." /><small>{reason.length}/500 · Included in the decision record</small></label>
        <button type="button" className="btn-primary" disabled={!choice.ready || busy} onClick={() => setReview(true)}>Review replacement offer<ArrowRightIcon /></button>
      </section></div>}
    </Dialog.Panel></div>
  </Dialog>;
}
