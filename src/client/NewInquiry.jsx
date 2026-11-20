import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import api from '../api/axios';
import SeatingPreview from '../components/SeatingPreview';
import AlternativeBookingPlans from '../components/AlternativeBookingPlans';
import { defaultTablePlaces } from '../utils/tablePlan';
import { VenueChoice, VendorChoices, usePreferenceOptions } from '../components/InquiryPreferences';
import InquiryDateCalendar from './InquiryDateCalendar';
import TentativeVenueRequests from '../components/TentativeVenueRequests';
import { proposalDateRange, proposalLabel } from '../utils/proposalReview';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { EVENT_TYPES, MAX_ATTENDEES, readEventPlan } from '../utils/eventPlan';

export default function NewInquiry() {
  const { state, createInquiry } = useApp();
  const { currentUser, loading } = state;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const directory = usePreferenceOptions();
  const [venueChoice, setVenueChoice] = useState(undefined);
  const requestedRoom = directory.venues.data.find(room => room.active && room.name === params.get('preferredVenue'));
  const initialVenueId = Number(params.get('preferredVenueId')) || requestedRoom?.id || null;
  const preferredVenueId = venueChoice === undefined ? initialVenueId : venueChoice;
  const preferredVenue = directory.venues.data.find(room => room.id === preferredVenueId);
  const [form, setForm] = useState(() => {
    const plan = readEventPlan(params);
    return {
      eventType: plan.eventType,
      eventDate: plan.date,
      endDate: plan.endDate,
      expectedAttendees: plan.attendees,
      requirements: '',
      preferredVendorIds: [],
      requestedCategories: [],
      tableSetup: plan.tableSetup || 'UNDECIDED',
      eventName: '',
    };
  });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [planRevision, setPlanRevision] = useState(0);
  const [appliedOption, setAppliedOption] = useState(null);
  const optionNotice = useRef(null);
  useEffect(() => { if (planRevision) optionNotice.current?.focus(); }, [planRevision]);
  const [tablePlaces, setTablePlaces] = useState(defaultTablePlaces);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const errorNotice = useRef(null);
  useEffect(() => { if (error) { errorNotice.current?.focus(); errorNotice.current?.scrollIntoView({ block: 'center' }); } }, [error]);
  const [touchedCategories, setTouchedCategories] = useState(false);

  useEffect(() => {
    let active = true;
    const eventType = form.eventType;
    Promise.all([api.get('/vendors/service-categories'), api.get('/vendors/service-categories', { params: { eventType } })])
      .then(([response, defaults]) => {
        if (!active) return;
        const categories = response.data || [];
        setAvailableCategories(categories);
        if (!touchedCategories) {
          setForm((previous) => previous.eventType === eventType
            ? { ...previous, requestedCategories: defaults.data || [] }
            : previous);
        }
      })
      .catch(() => { if (active) setError('Could not load available event services.'); });
    return () => { active = false; };
  }, [form.eventType, touchedCategories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'eventType') {
      setTouchedCategories(false);
      setForm((prev) => ({
        ...prev,
        eventType: value,
        requestedCategories: [],
        preferredVendorIds: [],
      }));
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const toggleCategory = (category) => {
    setTouchedCategories(true);
    setForm((prev) => {
      const existing = prev.requestedCategories || [];
      const next = existing.includes(category)
        ? existing.filter((item) => item !== category)
        : [...existing, category];
      const preferredVendorIds = prev.preferredVendorIds.filter(id => next.includes(directory.vendors.data.find(v => v.id === id)?.serviceCategory));
      return { ...prev, requestedCategories: next, preferredVendorIds };
    });
  };

  const chooseSetup = tableSetup => setForm(previous => ({ ...previous, tableSetup }));
  const useAlternative = option => {
    setAppliedOption({
      previous:{ eventDate:form.eventDate, endDate:form.endDate, tableSetup:form.tableSetup, venueId:preferredVenueId },
      selected:option,
    });
    setVenueChoice(option.venueId);
    setForm(previous => ({ ...previous, eventDate: option.eventDate, endDate: option.endDate, tableSetup: option.tableSetup }));
    setPlanRevision(value => value + 1);
  };
  const optionIsCurrent = appliedOption && appliedOption.selected.venueId === preferredVenueId &&
    appliedOption.selected.eventDate === form.eventDate && appliedOption.selected.endDate === form.endDate &&
    appliedOption.selected.tableSetup === form.tableSetup;
  const undoAlternative = () => {
    const { venueId, ...datesAndSetup } = appliedOption.previous;
    setVenueChoice(venueId);
    setForm(previous => ({ ...previous, ...datesAndSetup }));
    setAppliedOption(null);
    setPlanRevision(value => value + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.eventDate || (form.endDate && form.endDate < form.eventDate)) {
      setError('Select a start date and an end date on or after it.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const inquiry = await createInquiry({
        clientId: currentUser?.id,
        clientName: currentUser?.name || currentUser?.fullName,
        ...form,
        preferredVenueId,
        requestedGuestsPerTable: tablePlaces[form.tableSetup] ?? null,
        requestedCategories: form.requestedCategories,
        expectedAttendees: Number(form.expectedAttendees),
      });
      navigate(`/client/inquiries/${inquiry.id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="New Inquiry">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  return <Layout title="Plan an event"><div>
    <PageHeader eyebrow="Make room for your next event" title="Tell us what you have in mind."
      subtitle="Start with your plans. Your coordinator will help with the details and prepare a proposal."
      action={<Link className="btn-outline" to="/client/inquiries">My event plans</Link>} />
    {error && <div ref={errorNotice} tabIndex={-1} role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    <div className="inquiry-form-grid">
      <form onSubmit={handleSubmit} className="inquiry-form">
        <section className="inquiry-form-section" id="request-about">
          <div className="inquiry-section-heading"><span>01</span><div><h2>Your event</h2><p>Give your event a name and tell us how many people to expect.</p></div></div>
          <div className="inquiry-field-grid">
            <label>Event name<input name="eventName" value={form.eventName} onChange={handleChange} required maxLength={200} placeholder="e.g. Medical Equipment Exhibition 2027" autoComplete="off" /></label>
            <label>Event type<select name="eventType" value={form.eventType} onChange={handleChange}>{EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Expected attendees<input type="number" name="expectedAttendees" value={form.expectedAttendees} onChange={handleChange} required min="1" max={MAX_ATTENDEES} placeholder="Estimated number of guests" /></label>
            <label className="sm:col-span-2">Table and seating setup<select name="tableSetup" value={form.tableSetup} onChange={handleChange}>
              {[['UNDECIDED','Help me choose'],['THEATRE','Theatre — rows of chairs'],['CLASSROOM','Classroom — tables facing the front'],['BANQUET','Banquet — round dining tables'],['CABARET','Cabaret — round tables facing the stage'],['BOARDROOM','Boardroom — one shared meeting table'],['U_SHAPE','U-shape — tables arranged in a U']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
            </select><small>Room capacity depends on the setup. It is fine to ask your coordinator for advice.</small></label>
          </div>
          <VenueChoice resource={directory.venues} value={preferredVenueId} onChange={setVenueChoice} savedName={params.get('preferredVenue')} />
          {form.tableSetup === 'UNDECIDED' ? <details className="preference-picker"><summary>See a sample seating arrangement</summary>
            <SeatingPreview onChooseSetup={chooseSetup} setup={form.tableSetup} venue={preferredVenue} guests={form.expectedAttendees} />
          </details> : <SeatingPreview onChooseSetup={chooseSetup} setup={form.tableSetup} venue={preferredVenue} guests={form.expectedAttendees} tablePlaces={tablePlaces} onChangePlaces={setTablePlaces} />}
        </section>
        <section className="inquiry-form-section" id="request-dates">
          <div className="inquiry-section-heading"><span>02</span><div><h2>Choose your dates</h2><p>We check space for your event, including the required setup and takedown days.</p></div></div>
          <TentativeVenueRequests start={form.eventDate} end={form.endDate || form.eventDate} />
          <InquiryDateCalendar key={planRevision} preferredVenueId={preferredVenueId} tableSetup={form.tableSetup} eventType={form.eventType} start={form.eventDate} end={form.endDate} attendees={form.expectedAttendees}
            onChange={(eventDate, endDate) => setForm(previous => ({ ...previous, eventDate, endDate }))}>
            <details className="room-recovery"><summary>Find another room or nearby dates</summary>
              <AlternativeBookingPlans preferredRoom={preferredVenue} plan={{date:form.eventDate, endDate:form.endDate, attendees:form.expectedAttendees, eventType:form.eventType, tableSetup:form.tableSetup}}
                actionLabel="Use this option in my request" onChoose={useAlternative} />
            </details>
          </InquiryDateCalendar>
          {planRevision > 0 && (optionIsCurrent || !appliedOption) && <div role="status" tabIndex={-1} ref={optionNotice} className="room-applied">
            {optionIsCurrent ? <><strong>{appliedOption.selected.venueName}</strong> · {proposalDateRange(form)} added to your draft. <button type="button" className="underline" onClick={undoAlternative}>Undo change</button></> : 'Previous room and dates restored.'}
          </div>}
          <p className="mt-4 text-xs leading-relaxed text-slate-500">You can still send a request if your preferred dates are unavailable. Your coordinator can discuss alternatives. Sending an inquiry does not reserve a venue.</p>
        </section>
        <section className="inquiry-form-section" id="request-services">
          <div className="inquiry-section-heading"><span>03</span><div><h2>Services and other needs</h2><p>We have suggested services for your event type. Change these to suit your plans.</p></div></div>
          <fieldset><legend className="sr-only">Services needed</legend><div className="service-selection">{availableCategories.map(category => <label key={category}><input type="checkbox" checked={(form.requestedCategories || []).includes(category)} onChange={() => toggleCategory(category)} /><span>{proposalLabel(category)}</span></label>)}</div></fieldset>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Clear all boxes if you do not need AICC to arrange services.</p>
          <details className="preference-picker"><summary>Choose preferred vendors{form.preferredVendorIds.length ? ' · ' + form.preferredVendorIds.length + ' selected' : ' (optional)'}</summary>
            <VendorChoices resource={directory.vendors} categories={form.requestedCategories} eventType={form.eventType} selected={form.preferredVendorIds} onChange={ids => setForm(previous => ({ ...previous, preferredVendorIds: ids }))} />
          </details>
          <label className="mt-6 grid gap-2 text-sm font-medium text-slate-700">Anything else we should know? <span className="text-xs font-normal text-slate-500">Optional</span><textarea name="requirements" rows="4" value={form.requirements} onChange={handleChange} placeholder="Tell us about any special requirements or a venue or service you could not find." /></label>
        </section>
        <div className="inquiry-submit"><p>No payment is needed to send an inquiry.<br />A coordinator will review your request before preparing a proposal.</p><button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Sending your request…' : 'Send event request'}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></button></div>
      </form>
      <aside className="inquiry-summary" aria-label="Your request summary">
        <p className="eyebrow">Your request, so far</p><h2>{form.eventName || 'Event request'}</h2>
        <dl>{preferredVenue && <div><dt>Preferred venue</dt><dd>{preferredVenue.name}</dd></div>}<div><dt>Event type</dt><dd>{proposalLabel(form.eventType)}</dd></div><div><dt>Expected guests</dt><dd>{form.expectedAttendees || 'Add an estimate'}</dd></div><div><dt>Event dates</dt><dd>{form.eventDate ? proposalDateRange({ eventDate: form.eventDate, endDate: form.endDate }) : 'Choose your dates'}</dd></div><div><dt>Seating setup</dt><dd>{form.tableSetup === 'UNDECIDED' ? 'Advice from coordinator' : proposalLabel(form.tableSetup)}</dd></div><div><dt>Services selected</dt><dd>{form.requestedCategories.length ? form.requestedCategories.map(proposalLabel).join(', ') : 'No services selected'}</dd></div></dl>
        <p>What happens next?</p><p>Your coordinator reviews your requirements, checks the venue and prepares a proposal for you to consider.</p>
        <nav aria-label="Request form sections" className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-indigo-800"><a href="#request-about">Event</a><a href="#request-dates">Dates</a><a href="#request-services">Services</a></nav>
      </aside>
    </div>
  </div></Layout>;
}
