import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon, BuildingOffice2Icon, MapPinIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import EventPlanForm from '../components/EventPlanForm';
import useApiResource from '../hooks/useApiResource';
import { formatDate } from '../utils/helpers';
import { readEventPlan } from '../utils/eventPlan';

function VenueResults({ query, plan }) {
  const resource = useApiResource(plan.date ? `/venues/available?${query}` : '/venues');
  const venues = resource.data.filter(venue => venue.active &&
    (plan.date || !plan.attendees || venue.capacity == null || venue.capacity >= Number(plan.attendees)))
    .sort((first, second) => (first.capacity ?? Infinity) - (second.capacity ?? Infinity) || first.name.localeCompare(second.name));

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
      {venues.map(venue => <li key={venue.id} className="surface flex flex-col gap-3 p-5">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><BuildingOffice2Icon className="h-6 w-6" aria-hidden="true" /></span>
        <h3 className="text-lg font-semibold">{venue.name}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5"><UserGroupIcon className="h-4 w-4" aria-hidden="true" />
            {venue.capacity == null ? 'Capacity on request' : `Up to ${venue.capacity.toLocaleString()} attendees`}
          </span>
          {venue.location && <span className="inline-flex items-center gap-1.5"><MapPinIcon className="h-4 w-4" aria-hidden="true" />{venue.location}</span>}
        </div>
        {venue.description && <p className="text-sm leading-relaxed text-slate-600">{venue.description}</p>}
        {venue.resources && <p className="text-sm leading-relaxed text-slate-600"><strong className="text-slate-800">Resources</strong> · {venue.resources}</p>}
        <div className="mt-auto pt-2">
          <Link to={`/client/new-inquiry?${query}&${new URLSearchParams({ preferredVenue: venue.name })}`}
            className="btn-outline" aria-label={`Start an inquiry for ${venue.name}`}>Start inquiry <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </li>)}
    </ul> : <p className="surface p-6 text-sm text-slate-600">
      {plan.date ? 'No active venue matches these dates and attendance. Try a different date or adjust your guest count.'
        : 'No active venues match this search. Try adjusting your guest count.'}
    </p>}
  </section>;
}

export default function ClientVenues() {
  const [params, setParams] = useSearchParams();
  const { key } = useLocation();
  const plan = readEventPlan(params);
  const query = new URLSearchParams(Object.entries(plan).filter(([, value]) => value)).toString();

  return <Layout title="Find a venue">
    <div className="space-y-6">
      <PageHeader eyebrow="Client workspace" title="Find a venue"
        subtitle="Compare active spaces by capacity and check which venues can accommodate your dates and event type."
        action={<Link className="btn-primary" to={`/client/new-inquiry?${query}`}>Continue to inquiry <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>} />
      <EventPlanForm key={query} plan={plan} dateRequired onSearch={setParams}
        className="surface grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
        <button className="btn-primary" type="submit">Check availability</button>
      </EventPlanForm>
      <p className="text-sm text-slate-600">Availability can change until a coordinator verifies payment and reserves the venue. Choosing a space adds it as a preference in your inquiry.</p>
      <VenueResults key={key} plan={plan} query={query} />
    </div>
  </Layout>;
}
