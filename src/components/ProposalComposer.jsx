import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, BuildingOffice2Icon, MagnifyingGlassIcon, CheckCircleIcon, ExclamationTriangleIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useApp } from '../context/AppContext';
import api from '../api/axios';
import AlternativeBookingPlans from './AlternativeBookingPlans';
import VendorSuggestions from './VendorSuggestions';
import VenueComparisonDialog from './VenueComparisonDialog';
import TentativeVenueRequests from './TentativeVenueRequests';
import { SEATING, initialProposalDraft, seatingCapacity, proposedWindow, proposalChecks, proposalPayload } from '../utils/proposalBuilder';
import { compareProposals, proposalLabel, proposalMoney, proposalDateRange, readProposal, proposalVendors } from '../utils/proposalReview';
import { tomorrowDateKey } from '../utils/eventPlan';

const steps = [['Venue & dates', 'Find the right space'], ['Services', 'Build the package'], ['Review & send', 'Check the complete offer']];
const dateRange = (start, end) => proposalDateRange({ eventDate: start, endDate: end });

export default function ProposalComposer({ inquiry, onSuccess, onSubmit, onCancel, editMode = false }) {
  const { sendProposal, updateProposal } = useApp();
  const [draft, setDraft] = useState(() => initialProposalDraft(inquiry, editMode));
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const [categories, setCategories] = useState(null);
  const [categoryError, setCategoryError] = useState('');
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [compared, setCompared] = useState([]);
  const [search, setSearch] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [activeService, setActiveService] = useState(null);
  const [discard, setDiscard] = useState(false);
  const [vendorNames, setVendorNames] = useState(() => Object.fromEntries(proposalVendors(readProposal(inquiry.proposal)).flatMap(group => group.vendors.map(vendor => [vendor.id, vendor.name]))));
  const initial = useRef(JSON.stringify(initialProposalDraft(inquiry, editMode)));
  const panel = useRef(null);
  const dirty = JSON.stringify(draft) !== initial.current;
  const earliestDate = tomorrowDateKey();
  const criteria = JSON.stringify([draft.eventDate, draft.endDate, draft.expectedAttendees, draft.tableSetup, inquiry.id, editMode, retry]);
  const fresh = result?.criteria === criteria;
  const validDates = /^\d{4}-\d{2}-\d{2}$/.test(draft.eventDate) && draft.eventDate >= earliestDate && (!draft.endDate || draft.endDate >= draft.eventDate) && Number.isInteger(Number(draft.expectedAttendees)) && Number(draft.expectedAttendees) >= 1;
  const loading = validDates && !fresh;
  const venueError = fresh ? result.error : '';
  const venues = fresh && !venueError ? result.venues : [];
  const selected = venues.find(venue => String(venue.id) === String(draft.venueId));
  const window = proposedWindow(draft, selected, inquiry.eventType);
  const capacity = seatingCapacity(selected, draft.tableSetup);
  const checks = proposalChecks(draft, selected, { checked: fresh, loading, error: venueError, earliestDate });
  if (!categories || categoryError) checks.services = 'Load the service directory before sending.';
  else if (draft.categories.some(category => !categories.includes(category))) checks.services = 'Remove services that are no longer in the directory.';
  const valid = Object.keys(checks).length === 0;
  const venueReady = !Object.keys(checks).some(key => key !== 'services');
  const service = draft.categories.includes(activeService) ? activeService : draft.categories[0];
  const previous = editMode ? readProposal(inquiry.proposal) : null;
  const payload = selected ? proposalPayload(draft, selected, inquiry.proposalVersion) : null;
  const changes = previous && payload ? compareProposals(payload, previous) : null;
  const visibleVenues = [...venues].filter(venue => venue.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (seatingCapacity(a, draft.tableSetup) ?? Infinity) - (seatingCapacity(b, draft.tableSetup) ?? Infinity));
  const comparisonRooms = venues.filter(venue => compared.includes(String(venue.id)));
  const update = (key, value) => { setDraft(old => ({ ...old, [key]: value })); setError(''); };

  useEffect(() => {
    if (!dirty || sending) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    globalThis.addEventListener('beforeunload', warn);
    return () => globalThis.removeEventListener('beforeunload', warn);
  }, [dirty, sending]);
  useEffect(() => {
    const controller = new AbortController();
    setCategoryError('');
    api.get('/vendors/service-categories', { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setCategories(Array.isArray(data) ? data : []);
    }).catch(() => { if (!controller.signal.aborted) setCategoryError('The service directory could not be loaded.'); });
    return () => controller.abort();
  }, [categoryRetry]);
  useEffect(() => {
    if (!validDates) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/venues/available', { params: {
          date: draft.eventDate, endDate: draft.endDate || draft.eventDate, attendees: Number(draft.expectedAttendees), eventType: inquiry.eventType,
          tableSetup: draft.tableSetup, inquiryId: editMode ? inquiry.id : undefined,
        }, signal: controller.signal });
        if (!controller.signal.aborted) setResult({ criteria, venues: Array.isArray(data) ? data : [] });
      } catch (err) {
        if (!controller.signal.aborted) setResult({ criteria, venues: [], error: err.response?.data?.message || 'Availability could not be checked. Try again before choosing a venue.' });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [criteria, validDates, inquiry.eventType]);

  function goTo(index) { setStep(index); setAttempted(false); setTimeout(() => panel.current?.focus(), 0); }
  function next() {
    setAttempted(true);
    if (step === 0 && !venueReady || step === 1 && checks.services) return;
    goTo(Math.min(2, step + 1));
  }
  function toggleService(category) {
    setDraft(old => ({ ...old, categories: old.categories.includes(category) ? old.categories.filter(value => value !== category) : [...old.categories, category] }));
  }
  function moveVendor(category, id, direction) {
    setDraft(old => {
      const ids = [...(old.vendorShortlist[category] || [])]; const index = ids.indexOf(id); const next = index + direction;
      if (next < 0 || next >= ids.length) return old;
      [ids[index], ids[next]] = [ids[next], ids[index]];
      return { ...old, vendorShortlist: { ...old.vendorShortlist, [category]: ids } };
    });
  }
  async function send() {
    setAttempted(true);
    if (!valid || !payload || sending) return;
    setSending(true); setError('');
    try {
      const saved = editMode ? await updateProposal(inquiry.id, payload) : await sendProposal(inquiry.id, payload);
      initial.current = JSON.stringify(draft);
      (onSuccess || onSubmit)?.(saved);
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === 'string' ? data : data?.message || 'The proposal could not be sent. Your edits are still here. Review the message and try again.');
      setRetry(value => value + 1);
    } finally { setSending(false); }
  }
  const fieldError = key => attempted && checks[key] ? <small className="composer-field-error" role="alert">{checks[key]}</small> : null;

  return <div className="proposal-composer">
    <header className="composer-heading"><div><p className="eyebrow">{editMode ? 'Revise the current proposal' : 'From client brief to a complete offer'}</p><h2>{editMode ? 'Shape the next proposal.' : 'Build a proposal that fits.'}</h2><p>Compare the space, agree the package and review what the client will receive.</p></div><span className="composer-draft-tag">Unsent draft</span></header>
    <nav className="composer-steps" aria-label="Proposal preparation">{steps.map(([title, note], index) => <button key={title} type="button" disabled={sending} aria-current={step === index ? 'step' : undefined} onClick={() => goTo(index)}><span>{index < step ? <CheckIcon /> : '0' + (index + 1)}</span><span><strong>{title}</strong><small>{note}</small></span></button>)}</nav>
    {error && <p role="alert" className="composer-error">{error}</p>}
    <div className="composer-layout"><section className="composer-main" ref={panel} tabIndex={-1} aria-label={steps[step][0]}>
      <fieldset disabled={sending} className="composer-stage-fields">
      {step === 0 && <>
        <div className="composer-section-heading"><span>01 / SPACE & DATES</span><h3>Find the room that fits the event.</h3><p>Availability updates when you change dates, attendance or seating.</p></div>
        <div className="composer-fields">
          <label className="composer-wide">Event name<input value={draft.eventName} maxLength={200} onChange={e => update('eventName', e.target.value)} aria-invalid={Boolean(attempted && checks.eventName)} />{fieldError('eventName')}</label>
          <label>Start date<input type="date" min={earliestDate} value={draft.eventDate} onChange={e => update('eventDate', e.target.value)} />{fieldError('eventDate')}</label>
          <label>End date<input type="date" min={draft.eventDate || earliestDate} value={draft.endDate} onChange={e => update('endDate', e.target.value)} />{fieldError('endDate')}</label>
          <label>Expected guests<input type="number" min="1" max="2147483647" value={draft.expectedAttendees} onChange={e => update('expectedAttendees', e.target.value)} />{fieldError('expectedAttendees')}</label>
          <label>Seating arrangement<select value={draft.tableSetup} onChange={e => update('tableSetup', e.target.value)}><option value="UNDECIDED">Agree a setup</option>{SEATING.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select>{fieldError('tableSetup')}</label>
        </div>
        <TentativeVenueRequests start={draft.eventDate} end={draft.endDate || draft.eventDate} />
        <div className="composer-room-heading"><div><h4>Choose a suitable space</h4><p>{loading ? 'Checking the full venue window…' : fresh ? venues.length + ' available spaces for these requirements' : 'Enter future dates and attendance to check.'}</p></div><button className="btn-outline" type="button" disabled={loading || !validDates} onClick={() => setRetry(value => value + 1)}>Recheck</button></div>
        {venueError && <p role="alert" className="composer-error">{venueError}</p>}
        {loading ? <div className="room-skeleton" role="status">Checking capacity, bookings and holds…</div> : venues.length > 0 ? <>
          <label className="composer-room-search"><MagnifyingGlassIcon /><span className="sr-only">Find a room</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a hall or meeting room" /></label>
          <div className="composer-room-grid">{visibleVenues.map(venue => {
            const seats = seatingCapacity(venue, draft.tableSetup); const chosen = String(venue.id) === String(draft.venueId); const comparison = compared.includes(String(venue.id));
            return <article key={venue.id} className={'composer-room ' + (chosen ? 'is-selected' : '')}>
              <div className="composer-room-top"><BuildingOffice2Icon /><span>{chosen ? 'Selected for proposal' : 'Available now'}</span>{chosen && <CheckCircleIcon />}</div>
              <h4>{venue.name}</h4><p>{venue.location || 'Addis International Convention Center'}</p>
              <div className="room-capacity"><strong>{seats ?? '—'}</strong><span>{seats == null ? 'Seats to be confirmed' : proposalLabel(draft.tableSetup) + ' capacity'}</span></div>
              {seats != null && <><div className="room-capacity-bar" aria-hidden="true"><span style={{ width: Math.min(100, Number(draft.expectedAttendees) / seats * 100) + '%' }} /></div><p className="room-capacity-note">{draft.expectedAttendees} guests · {seats - Number(draft.expectedAttendees)} spare seats</p></>}
              <div className="room-card-actions"><button type="button" className={chosen ? 'btn-outline' : 'btn-primary'} onClick={() => update('venueId', String(venue.id))}>{chosen ? 'Selected' : 'Use this room'}</button><label><input type="checkbox" checked={comparison} disabled={!comparison && comparisonRooms.length >= 3} onChange={() => setCompared(old => comparison ? old.filter(id => id !== String(venue.id)) : [...old.filter(id => venues.some(v => String(v.id) === id)), String(venue.id)])} />Compare</label></div>
            </article>;
          })}</div>{!visibleVenues.length && <p className="composer-empty">No room names match. Clear the search to see all available spaces.</p>}
          {comparisonRooms.length > 0 && <button type="button" className="composer-compare-button" onClick={() => setShowComparison(true)}>Compare selected rooms ({comparisonRooms.length}/3)<ArrowRightIcon /></button>}
        </> : fresh && !venueError && <div className="composer-empty"><ExclamationTriangleIcon /><h4>No venue meets this combination.</h4><p>Try another seating setup or explore nearby dates below. Changed terms still need the client’s agreement.</p></div>}
        {fieldError('venue')}
        <details className="composer-alternatives"><summary>Explore nearby dates and other booking options</summary><AlternativeBookingPlans inquiryId={editMode ? inquiry.id : undefined} plan={{ date: draft.eventDate, endDate: draft.endDate, attendees: draft.expectedAttendees, eventType: inquiry.eventType, tableSetup: draft.tableSetup }} onChoose={option => setDraft(old => ({ ...old, eventDate: option.eventDate, endDate: option.endDate, venueId: String(option.venueId) }))} /></details>
        <div className="composer-section-heading composer-pricing-heading"><span>THE COMMERCIAL DETAILS</span><h3>Agree the price and terms.</h3><p>The total covers the full booking window and selected services. AICC enters its agreed price.</p></div>
        <div className="composer-fields"><label>Quoted total in ETB<input type="number" min="1" step="1" max="2147483647" value={draft.customPrice} onChange={e => update('customPrice', e.target.value)} placeholder="Enter the agreed total" />{fieldError('customPrice')}</label><div className="composer-price-note">Current quote<strong>{draft.customPrice ? proposalMoney(draft.customPrice) : 'To be entered'}</strong></div><label className="composer-wide">Terms for the client<textarea rows={5} value={draft.terms} onChange={e => update('terms', e.target.value)} placeholder="Include what the quote covers, payment instructions and cancellation terms." />{fieldError('terms')}</label></div>
      </>}
      {step === 1 && <>
        <div className="composer-section-heading"><span>02 / BUILD THE PACKAGE</span><h3>Choose services and vendor preferences.</h3><p>Suggestions guide later sourcing; they do not reserve a vendor or create an offer.</p></div>
        {categoryError && <p role="alert" className="composer-error">{categoryError} <button type="button" className="underline" onClick={() => setCategoryRetry(value => value + 1)}>Try again</button></p>}
        {!categories && !categoryError && <p role="status">Loading service categories…</p>}
        <fieldset className="composer-service-choices"><legend>Services included in this proposal</legend>{[...new Set([...(categories || []), ...draft.categories])].map(category => <label key={category} className={draft.categories.includes(category) ? 'is-selected' : ''}><input type="checkbox" checked={draft.categories.includes(category)} onChange={() => toggleService(category)} /><span>{proposalLabel(category)}{categories && !categories.includes(category) && <small>Not in the directory — remove to continue</small>}</span></label>)}</fieldset>
        {!draft.categories.length ? <div className="composer-empty"><CheckCircleIcon /><h4>Venue-only proposal</h4><p>No services are included. No vendor preferences will be sent.</p></div> : <div className="composer-service-workspace"><nav aria-label="Service to plan">{draft.categories.map(category => <button type="button" key={category} aria-pressed={service === category} onClick={() => setActiveService(category)}><span>{proposalLabel(category)}</span><small>{draft.vendorShortlist[category]?.length || 0} preferred</small></button>)}</nav><section aria-label={proposalLabel(service) + ' vendor preferences'}>
          <h4>{proposalLabel(service)}</h4>
          {service === 'venue' ? <p>AICC venue: {selected?.name || 'Choose the room in the first step'}.</p> : service === 'catering' && inquiry.eventType !== 'wedding' ? <p>AICC provides catering for this event. An external catering vendor is not required.</p> : <>
            <p className="composer-service-note">Selected vendors are tried in the order shown. Saved client preferences take priority. Eligibility is checked again during booking.</p>
            {(draft.vendorShortlist[service] || []).length > 0 && <ol className="composer-priority-list" aria-label="Preferred vendor priority">{draft.vendorShortlist[service].map((vendorId, index, ids) => <li key={vendorId}><span>{index + 1}</span><p>{vendorNames[vendorId] || 'Vendor #' + vendorId}<small>{index === 0 ? 'First preference' : 'Next preference'}</small></p><button type="button" aria-label={'Move vendor ' + vendorId + ' earlier'} disabled={index === 0} onClick={() => moveVendor(service, vendorId, -1)}>↑</button><button type="button" aria-label={'Move vendor ' + vendorId + ' later'} disabled={index === ids.length - 1} onClick={() => moveVendor(service, vendorId, 1)}>↓</button><button type="button" aria-label={'Remove vendor ' + vendorId} onClick={() => update('vendorShortlist', { ...draft.vendorShortlist, [service]: ids.filter(id => id !== vendorId) })}><XMarkIcon /></button></li>)}</ol>}
            <VendorSuggestions key={service + '-' + draft.eventDate} category={service} eventDate={draft.eventDate} selectedVendorIds={draft.vendorShortlist[service] || []} onSelectVendor={vendor => {
              setVendorNames(old => ({ ...old, [vendor.id]: vendor.companyName }));
              const ids = draft.vendorShortlist[service] || []; update('vendorShortlist', { ...draft.vendorShortlist, [service]: ids.includes(Number(vendor.id)) ? ids.filter(id => id !== Number(vendor.id)) : [...ids, Number(vendor.id)] });
            }} />
          </>}
        </section></div>}{fieldError('services')}
      </>}
      {step === 2 && <>
        <div className="composer-section-heading"><span>03 / READY FOR THE CLIENT</span><h3>Read it as your client would.</h3><p>Check the complete offer before a new proposal version is sent.</p></div>
        {editMode && <div className="composer-revision-warning"><ExclamationTriangleIcon /><div><strong>The client will need to agree again.</strong><p>A revision replaces the current acceptance, contract signatures and payment hold. Previous versions stay in the history.</p></div></div>}
        <article className="composer-client-preview"><div className="composer-preview-top"><span>AICC / PROPOSAL PREVIEW</span><span>{editMode ? 'Revised offer' : 'New offer'}</span></div><h3>{draft.eventName || 'Event name needed'}</h3><p>Prepared for {inquiry.clientName}</p><dl><div><dt>Venue</dt><dd>{selected?.name || 'Choose an available room'}</dd></div><div><dt>Event dates</dt><dd>{dateRange(draft.eventDate, draft.endDate)}</dd></div><div><dt>Guests & setup</dt><dd>{draft.expectedAttendees} · {proposalLabel(draft.tableSetup)}</dd></div><div><dt>Full venue window</dt><dd>{window ? dateRange(window.from, window.through) : 'Not yet checked'}</dd></div><div className="composer-wide"><dt>Included services</dt><dd>{draft.categories.length ? draft.categories.map(proposalLabel).join(', ') : 'No services selected'}</dd></div><div className="composer-wide"><dt>Preferred vendors, in order</dt><dd>{draft.categories.filter(category => draft.vendorShortlist[category]?.length).map(category => <p key={category}>{proposalLabel(category)}: {draft.vendorShortlist[category].map(id => vendorNames[id] || 'Vendor #' + id).join(' → ')}</p>)}{!draft.categories.some(category => draft.vendorShortlist[category]?.length) && 'No preferences — eligible vendors will be selected later'}</dd></div></dl><div className="composer-quote"><span>Total quoted</span><strong>{proposalMoney(draft.customPrice || null)}</strong></div><div className="composer-preview-terms"><h4>Terms and conditions</h4><p>{draft.terms || 'Terms needed'}</p></div></article>
        {changes && <section className="composer-change-review"><h4>What changes from the last proposal?</h4>{changes.changes.length ? <ul>{changes.changes.map(change => <li key={change.label}><strong>{change.label}</strong><span>{change.before}</span><ArrowRightIcon /><span>{change.after}</span></li>)}</ul> : <p>No differences found in the comparable saved fields.</p>}{changes.missing.length > 0 && <p className="composer-service-note">Some older fields were not recorded. Check the full preview above.</p>}</section>}
        {!valid && <div className="composer-error"><strong>Resolve these before sending</strong><ul>{Object.values(checks).map(message => <li key={message}>{message}</li>)}</ul><button type="button" onClick={() => goTo(checks.services && Object.keys(checks).length === 1 ? 1 : 0)} className="underline">Return to the details</button></div>}
      </>}
      </fieldset>
      <footer className="composer-footer"><button type="button" className="btn-outline" disabled={sending} onClick={() => step ? goTo(step - 1) : dirty ? setDiscard(true) : onCancel?.()}><ArrowLeftIcon />{step ? 'Back' : 'Cancel'}</button><span>{step === 2 ? 'Sending does not book the venue.' : 'Nothing is sent until the final review.'}</span>{step < 2 ? <button type="button" className="btn-primary" onClick={next}>Continue<ArrowRightIcon /></button> : <button type="button" className="btn-primary" disabled={!valid || sending} onClick={send}>{sending ? 'Sending proposal…' : editMode ? 'Send revised proposal' : 'Send proposal'}<PaperAirplaneIcon /></button>}</footer>
    </section><aside className="composer-brief"><p className="eyebrow">The client’s recorded requirements</p><h3>{inquiry.eventName || 'Event request'}</h3><p>{inquiry.clientName} · #{inquiry.id}</p><dl><div><dt>Requested dates</dt><dd>{dateRange(inquiry.eventDate, inquiry.endDate)}</dd></div><div><dt>Attendance</dt><dd>{inquiry.expectedAttendees} guests</dd></div><div><dt>Seating</dt><dd>{proposalLabel(inquiry.tableSetup)}</dd></div><div><dt>Requested services</dt><dd>{inquiry.requestedCategories?.length ? inquiry.requestedCategories.map(proposalLabel).join(', ') : 'No services selected'}</dd></div></dl>{inquiry.requirements && <details><summary>Additional requirements</summary><p>{inquiry.requirements}</p></details>}<div className="composer-live-plan"><span>YOUR CURRENT PLAN</span><h4>{selected?.name || 'Choose a room'}</h4><p>{draft.expectedAttendees} guests · {proposalLabel(draft.tableSetup)}</p>{capacity != null && <p>{capacity} seats in this setup</p>}{window && <><strong>{window.days}-day venue window</strong><p>{dateRange(window.from, window.through)}</p></>}<strong>{draft.customPrice ? proposalMoney(draft.customPrice) : 'Total to be entered'}</strong></div><p className="composer-brief-note">Availability is checked again when the booking is made. This preview creates no reservation.</p></aside></div>
    <VenueComparisonDialog open={showComparison} onClose={() => setShowComparison(false)} venues={comparisonRooms} plan={{ ...draft, eventType: inquiry.eventType }} onChoose={venue => { update('venueId', String(venue.id)); setShowComparison(false); }} />
    <Dialog open={discard} onClose={setDiscard} className="relative z-[80]"><div className="composer-dialog-backdrop" aria-hidden="true" /><div className="composer-dialog-scroll"><Dialog.Panel className="composer-discard-dialog"><Dialog.Title>Leave this draft?</Dialog.Title><p>Your edits have not been sent or saved. Keep editing to finish the proposal.</p><div><button type="button" className="btn-outline" onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className="btn-danger" onClick={() => { setDiscard(false); onCancel?.(); }}>Discard edits</button></div></Dialog.Panel></div></Dialog>
  </div>;
}
