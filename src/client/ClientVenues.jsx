import { useState } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, BuildingOffice2Icon, MapPinIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import EventPlanForm from '../components/EventPlanForm';
import { VenueAvailabilityReasons } from '../components/VenueAvailabilityReasons';
import AlternativeBookingPlans from '../components/AlternativeBookingPlans';
import useApiResource from '../hooks/useApiResource';
import { formatDate } from '../utils/helpers';
import { readEventPlan } from '../utils/eventPlan';
import { seatingCapacity } from '../utils/proposalBuilder';
import VenueComparisonDialog from '../components/VenueComparisonDialog';
const seats = (venue, setup) => !setup || setup === 'UNDECIDED' ? venue.capacity : seatingCapacity(venue, setup);

function VenueResults({ query, plan }) {
  const [compared, setCompared] = useState([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const navigate = useNavigate();
  const resource = useApiResource(plan.date ? `/venues/available?${query}` : '/venues');
  const reasons = useApiResource(plan.date ? `/venues/availability/reasons?${query}` : null);
  const venues = resource.data.filter(venue => venue.active &&
    (plan.date || !plan.attendees || (seats(venue,plan.tableSetup)!=null&&seats(venue,plan.tableSetup)>=Number(plan.attendees))))
    .sort((first, second) => (seats(first, plan.tableSetup) ?? Infinity) - (seats(second, plan.tableSetup) ?? Infinity) || first.name.localeCompare(second.name));

  if (resource.loading) return <p role="status" className="surface p-6 text-sm text-slate-600">Loading venues…</p>;
  if (resource.error) return <div role="alert" className="surface p-6 text-sm text-rose-800">
    Venue information could not be loaded. <button type="button" className="ml-2 font-semibold underline" onClick={resource.reload}>Try again</button>
  </div>;

  return <section aria-labelledby="venue-results-title" className="space-y-4">
    <div>
      <h2 id="venue-results-title" className="text-xl font-semibold">
        {plan.date ? 'Available venues' : 'Active venues'} <span className="text-sm text-slate-500">({venues.length})</span>
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {plan.date
          ? `${formatDate(plan.date + 'T00:00:00')}${plan.endDate && plan.endDate !== plan.date ? ` – ${formatDate(plan.endDate + 'T00:00:00')}` : ''}`
          : 'Add dates to check current availability.'}
        {plan.attendees && ` · ${Number(plan.attendees).toLocaleString()} attendees`}
      </p>
    </div>
    {venues.length ? <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {venues.map(venue => <li key={venue.id} className="venue-explore-card surface flex flex-col gap-3 p-5">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><BuildingOffice2Icon className="h-6 w-6" aria-hidden="true" /></span>
        <h3 className="text-lg font-semibold">{venue.name}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><UserGroupIcon className="h-4 w-4" aria-hidden="true" />
            {seats(venue,plan.tableSetup) == null ? 'Capacity needs confirmation for this setup' : `Up to ${seats(venue,plan.tableSetup).toLocaleString()} attendees${plan.tableSetup&&plan.tableSetup!=='UNDECIDED'?' in '+plan.tableSetup.toLowerCase()+' setup':' (maximum; depends on setup)'}`}
          </span>
          {venue.location && <span className="inline-flex items-center gap-1.5"><MapPinIcon className="h-4 w-4" aria-hidden="true" />{venue.location}</span>}
        </div>
        {venue.description && <p className="text-sm leading-relaxed text-slate-600">{venue.description}</p>}
        {venue.resources && <p className="text-sm leading-relaxed text-slate-600"><strong className="text-slate-800">Resources</strong> · {venue.resources}</p>}
        <div className="venue-explore-actions">
          <label><input type="checkbox" checked={compared.includes(venue.id)} disabled={!compared.includes(venue.id) && compared.length >= 3} onChange={() => setCompared(old => old.includes(venue.id) ? old.filter(id => id !== venue.id) : [...old, venue.id])} />Compare this space</label>
          <Link to={`/client/new-inquiry?${query}&${new URLSearchParams({ preferredVenue: venue.name })}`}
            className="btn-outline" aria-label={`Start an inquiry for ${venue.name}`}>Start inquiry <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </li>)}
    </ul> : <p className="surface p-6 text-sm text-slate-600">
      {plan.date ? 'No active venue matches this selection. Keep your requirements and ask AICC about alternatives.'
        : 'No active venues match this search. Try adjusting your guest count.'}
      <Link className="mt-3 block font-semibold text-emerald-800 underline" to={`/client/new-inquiry?${query}`}>Keep these requirements and ask AICC for alternatives</Link>
    </p>}
    {compared.length > 0 && <div className="client-venue-compare"><div><strong>{compared.length} of 3 spaces selected</strong><p>Compare capacity, facilities and the full venue window.</p></div><div><button type="button" className="btn-outline" onClick={() => setCompared([])}>Clear</button><button type="button" className="btn-primary" onClick={() => setComparisonOpen(true)}>Compare spaces <ArrowRightIcon className="h-4 w-4" /></button></div></div>}
    <VenueComparisonDialog open={comparisonOpen} onClose={() => setComparisonOpen(false)} venues={venues.filter(venue => compared.includes(venue.id))} plan={{ ...plan, eventDate: plan.date, expectedAttendees: plan.attendees }} actionLabel="Continue with this space" onChoose={venue => navigate('/client/new-inquiry?' + query + '&' + new URLSearchParams({ preferredVenue: venue.name }))} />
    {plan.date && <details open={!venues.length} className="disclosure-row"><summary>Why are other venues unavailable?</summary><div className="mt-4">
      {reasons.loading ? <p role="status" className="text-sm text-slate-600">Checking availability explanations…</p> : reasons.error ? <p role="alert" className="text-sm text-amber-900">Explanations could not be loaded. <button type="button" onClick={reasons.reload} className="underline">Try again</button></p> : <VenueAvailabilityReasons venues={reasons.data} />}
    </div></details>}
    <details open={!venues.length} className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-emerald-900">Find alternative venues or nearby dates</summary>
      <div className="mt-4"><AlternativeBookingPlans plan={plan} /></div>
    </details>
  </section>;
}

export default function ClientVenues() {
  const [params, setParams] = useSearchParams();
  const { key } = useLocation();
  const plan = readEventPlan(params);
  const query = new URLSearchParams(Object.entries(plan).filter(([, value]) => value)).toString();

  return <Layout title="Find a space that fits your event.">
    <div className="space-y-6">
      <PageHeader eyebrow="Client workspace" title="Find a space that fits your event."
        subtitle="Check your dates, compare up to three rooms, and keep your preferred space when you start an inquiry."
        action={<Link className="btn-primary" to={`/client/new-inquiry?${query}`}>Continue to inquiry <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>} />
      <EventPlanForm key={query} plan={plan} dateRequired onSearch={setParams}
        className="surface grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 xl:items-end">
        <button className="btn-primary" type="submit">Check availability</button>
      </EventPlanForm>
      <p className="text-sm text-slate-600">Availability can change until a coordinator verifies payment and reserves the venue. Choosing a space adds it as a preference in your inquiry.</p>
      <VenueResults key={key} plan={plan} query={query} />
    </div>
  </Layout>;
}
