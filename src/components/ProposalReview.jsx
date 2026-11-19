import { useId, useState } from 'react';
import { ArrowsRightLeftIcon, ArrowRightIcon, CalendarDaysIcon, CheckIcon, ChevronDownIcon, DocumentTextIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';
import useApiResource from '../hooks/useApiResource';
import { compareProposals, proposalDateRange, proposalLabel, proposalMoney, proposalVendors, readProposal, savedProposalVersions } from '../utils/proposalReview';

function ProposalDetails({ proposal, archived = false }) {
  const vendors = proposalVendors(proposal);
  return <div className="proposal-terms">
    {proposal.eventType && <div><h4>Event type</h4><p>{proposalLabel(proposal.eventType)}</p></div>}
    {archived && <dl className="proposal-archive-facts">
      <div><dt>Event</dt><dd>{proposal.eventName || 'Not recorded'}</dd></div>
      <div><dt>Venue</dt><dd>{proposal.venue || 'Not recorded'}</dd></div>
      <div><dt>Event dates</dt><dd>{proposalDateRange(proposal)}</dd></div>
      <div><dt>Quoted total</dt><dd>{proposalMoney(proposal.price)}</dd></div>
      <div><dt>Attendance</dt><dd>{proposal.expectedAttendees ?? 'Not recorded'}</dd></div>
      <div><dt>Seating setup</dt><dd>{proposalLabel(proposal.tableSetup)}</dd></div>
    </dl>}
    <div><h4>Included services</h4>{Array.isArray(proposal.categories) ? proposal.categories.length
      ? <ul className="proposal-service-tags">{proposal.categories.map(category => <li key={category}>{proposalLabel(category)}</li>)}</ul>
      : <p>No services selected.</p> : <p>Not recorded in this proposal.</p>}</div>
    {vendors.length > 0 && <div><h4>Suggested vendors</h4><dl className="proposal-vendor-list">{vendors.map(group => <div key={group.category}><dt>{proposalLabel(group.category)}</dt><dd><ul className="space-y-3">{group.vendors.map((vendor, index) => <li key={vendor.id ?? `${vendor.name}-${index}`}><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{vendor.name}</span>{vendor.rating != null && <span className="proposal-vendor-rating">{vendor.rating > 0 ? `Rating ${vendor.rating.toFixed(1)} / 5` : 'No ratings yet'}</span>}</div>{vendor.description && <p className="proposal-vendor-description">{vendor.description}</p>}</li>)}</ul></dd></div>)}</dl><p className="proposal-footnote">These are suggestions. Vendor commitments are arranged after payment review and event creation.</p></div>}
    {proposal.pricingTier && <div><h4>Package</h4><p>{proposalLabel(proposal.pricingTier)}</p></div>}
    <div><h4>Terms and conditions</h4><p className="proposal-long-text">{proposal.terms || 'No terms recorded in this proposal.'}</p></div>
  </div>;
}

// The card uses only sent proposals and saved revisions. Inquiry edits are not accepted terms.
export function ProposalReviewCard({ inquiry, client = false, revisions = [], loading = false, error = '', onRetry, children }) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState('');
  const proposal = readProposal(inquiry.proposal);
  const versions = savedProposalVersions(revisions, inquiry.proposalVersion);
  const selected = versions.find(version => String(version.revisionNumber) === selectedVersion) || versions[0];
  const previous = readProposal(selected?.proposalJson);
  const comparison = compareProposals(proposal, previous);
  const pending = inquiry.status === 'PROPOSAL_SENT';
  const accepted = ['PROPOSAL_ACCEPTED', 'EVENT_CREATED'].includes(inquiry.status);
  const count = comparison.changes.length;
  const sent = proposal?.sentDate && new Date(proposal.sentDate);
  const sentLabel = sent && Number.isFinite(sent.getTime()) ? sent.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  if (!proposal) return <p className="proposal-load-note">Proposal details are unavailable. Refresh the request to try again.</p>;

  return <section className="proposal-review" aria-label={client ? 'Your current proposal' : 'Current client proposal'}>
    <header className="proposal-review-header">
      <div className="proposal-document-mark" aria-hidden="true"><DocumentTextIcon /></div>
      <div className="min-w-0 flex-1"><p className="proposal-eyebrow">{proposal.proposalNumber || 'AICC proposal'} <span aria-hidden="true">/</span> Version {inquiry.proposalVersion ?? '—'}</p><h2>{proposal.eventName || 'Your event proposal'}</h2><p className="proposal-sent-date">{sentLabel ? `Sent ${sentLabel}` : 'Current sent proposal'}</p></div>
      <span className={`proposal-state ${accepted ? 'is-accepted' : ''}`}>{accepted ? <><CheckIcon aria-hidden="true" />Accepted</> : pending ? client ? 'Your decision is needed' : 'Awaiting client decision' : 'Saved proposal'}</span>
    </header>

    <div className="proposal-review-body">
      <div className="proposal-offer-summary">
        <dl className="proposal-summary-facts">
          <div><dt><MapPinIcon aria-hidden="true" />Venue</dt><dd>{proposal.venue || 'Not recorded'}</dd></div>
          <div><dt><CalendarDaysIcon aria-hidden="true" />Event dates</dt><dd>{proposalDateRange(proposal)}</dd></div>
          <div><dt><UsersIcon aria-hidden="true" />Attendance and seating</dt><dd>{proposal.expectedAttendees != null ? `${Number(proposal.expectedAttendees).toLocaleString('en-US')} guests` : 'Attendance not recorded'}<span>{proposalLabel(proposal.tableSetup)}</span></dd></div>
        </dl>
        <div className="proposal-quoted-total"><p>Quoted total</p><strong>{proposalMoney(proposal.price)}</strong><span>For the services and terms in this proposal</span></div>
      </div>

      {loading && <p role="status" className="proposal-load-note">Checking for earlier proposals…</p>}
      {error && <p role="alert" className="proposal-load-note is-warning">Earlier proposals could not be loaded. {onRetry && <button type="button" onClick={onRetry}>Try again</button>}</p>}
      {!loading && !error && versions.length > 0 && <div className="proposal-change-notice">
        <span className="proposal-change-icon" aria-hidden="true"><ArrowsRightLeftIcon /></span>
        <div><h3>{client && pending ? 'Your proposal has been revised' : 'This proposal has earlier versions'}</h3><p>{comparison.available ? count ? `${count} ${count === 1 ? 'detail differs' : 'details differ'} from version ${selected.revisionNumber}.` : `The recorded details match version ${selected.revisionNumber}.` : 'The previous copy cannot be compared. You can still read the current proposal.'}{comparison.priceDelta != null && comparison.priceDelta !== 0 && <span className="proposal-price-change"> Total {comparison.priceDelta > 0 ? 'increased' : 'decreased'} by {proposalMoney(Math.abs(comparison.priceDelta))}.</span>}</p></div>
        <button type="button" className="proposal-review-changes" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(value => !value)}>{expanded ? 'Close comparison' : 'Review changes'}<ArrowRightIcon aria-hidden="true" /></button>
      </div>}

      {expanded && !loading && !error && versions.length > 0 && <section id={panelId} className="proposal-comparison" aria-label="Changes between proposal versions">
        <div className="proposal-comparison-heading"><div><p className="proposal-eyebrow">Only changed details</p><h3>What changed?</h3></div><label>Compare current version with<select value={String(selected.revisionNumber)} onChange={event => setSelectedVersion(event.target.value)}>{versions.map(version => <option key={version.id ?? version.revisionNumber} value={String(version.revisionNumber)}>Version {version.revisionNumber}</option>)}</select></label></div>
        {comparison.available ? <>
          {count > 0 ? <div className="proposal-change-table" role="table" aria-label="Changed proposal details">
            <div className="proposal-change-row proposal-change-table-head" role="row"><span role="columnheader">Detail</span><span role="columnheader">Version {selected.revisionNumber}</span><span role="columnheader">Current · version {inquiry.proposalVersion ?? '—'}</span></div>
            {comparison.changes.map(change => <div className="proposal-change-row" role="row" key={change.key}><strong role="rowheader">{change.label}</strong><div role="cell" className="proposal-before"><span className="proposal-mobile-label">Previously</span>{change.before}</div><div role="cell" className="proposal-after"><span className="proposal-mobile-label">Now</span>{change.after}</div></div>)}
          </div> : <p className="proposal-load-note">No changes were found in the details available in both copies. The latest sent version still applies.</p>}
          {comparison.missing.length > 0 && <p className="proposal-footnote">Some details were not recorded in both copies and cannot be compared: {comparison.missing.join(', ').toLowerCase()}.</p>}
        </> : <p role="status" className="proposal-load-note is-warning">This saved version is incomplete or unreadable. Its details cannot be compared reliably.</p>}
        {previous && <details key={selected.revisionNumber} className="proposal-saved-copy"><summary>Read version {selected.revisionNumber} in full <ChevronDownIcon aria-hidden="true" /></summary><p className="proposal-footnote">Saved for reference. Any response applies to the current proposal above.</p><ProposalDetails proposal={previous} archived /></details>}
      </section>}

      <details className="proposal-full-details"><summary><span><DocumentTextIcon aria-hidden="true" />Read the full proposal</span><ChevronDownIcon aria-hidden="true" /></summary><ProposalDetails proposal={proposal} /></details>
      {pending && <p className="proposal-decision-note">{client ? 'Review the full proposal before responding. Acceptance starts contract signing; the venue is booked after your payment receipt is verified.' : 'The client must accept this version before contract signing and payment review can continue.'}</p>}
      {accepted && <p className="proposal-decision-note"><CheckIcon aria-hidden="true" />These terms were accepted. Any revised proposal must be accepted again.</p>}
      {children && <div className="proposal-decision-actions">{children}</div>}
    </div>
  </section>;
}

export default function ProposalReview(props) {
  const history = useApiResource(`/inquiries/${props.inquiry.id}/proposal-history`);
  return <ProposalReviewCard {...props} revisions={history.data} loading={history.loading} error={history.error} onRetry={history.reload} />;
}
