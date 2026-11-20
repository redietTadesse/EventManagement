import AppearanceChoice from './Appearance';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon, ArrowUpRightIcon, BuildingOffice2Icon,

  MapPinIcon, PlusIcon, SparklesIcon, Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { useApp } from '../context/AppContext';
import { ROLE_DASHBOARDS } from '../utils/roles';
import Brand from './Brand';
import BookingWalkthrough from './BookingWalkthrough';
import EventPlanForm from './EventPlanForm';

const venueProfile = 'https://portal.iccaworld.org/member-suppliers/detail/?id=18b7dac1-0a00-f111-8407-000d3a648fcc';
const photoSource = 'https://www.ena.et/web/eng/w/eng_6075186';
const directions = 'https://www.google.com/maps/search/?api=1&query=Addis+International+Convention+Center%2C+Addis+Ababa';

const spaces = [
  { name: 'Multipurpose halls', detail: '2 column-free halls', icon: BuildingOffice2Icon, color: 'bg-[#e1ece5] text-[#19463d]',
    description: 'Open floor plans and high ceilings for plenary sessions, exhibitions, and large assemblies.',
    uses: 'Conferences · Trade shows · Assemblies' },
  { name: 'Meeting rooms', detail: '8 flexible rooms', icon: Squares2X2Icon, color: 'bg-[#f0e8d6] text-[#775922]',
    description: 'Smaller spaces for workshops, breakout sessions, and meetings alongside a larger program.',
    uses: 'Workshops · Seminars · Breakouts' },
  { name: 'Outdoor amphitheater', detail: '15,000 m² outdoors', icon: SparklesIcon, color: 'bg-[#e4e9ec] text-[#395867]',
    description: 'An open-air setting for cultural programs, performances, and outdoor exhibitions.',
    uses: 'Performances · Festivals · Exhibitions' },
];

const amenities = [
  ['Event technology', 'Audiovisual facilities and logistics support'],
  ['On-site catering', 'Food and beverage service for events'],
  ['Parking', 'Space for more than 1,200 vehicles'],
];

const questions = [
  ['Can I check dates before submitting an inquiry?', 'Yes. Sign in to the client workspace to see active venues that fit your dates, event type, and expected attendance.'],
  ['When is my venue reserved?', 'Acceptance marks the proposal as tentative. Both signatures start a seven-day payment hold. Your coordinator checks the receipt to book the room.'],
  ['Can I change the proposal?', 'You can request revisions from your inquiry page while reviewing a proposal. Your coordinator can update it for another review.'],
];

const shell = 'mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12';
const sectionTitle = 'font-serif text-4xl leading-tight tracking-tight text-[#142f32] sm:text-5xl';
const subtleLink = 'inline-flex items-center gap-2 text-sm font-semibold text-indigo-800 hover:underline';

export default function LandingPage() {
  const { state: { currentUser, loading } } = useApp();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const dashboard = ROLE_DASHBOARDS[currentUser?.role];
  const canPlan = !currentUser || currentUser.role === 'CLIENT';

  useEffect(() => { document.title = 'Addis International Convention Center · Event Portal'; }, []);
  useEffect(() => {
    const target = hash && document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [hash]);

  return <div className="aicc-public">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="public-header">
      <div className={`${shell} public-header-inner`}>
        <Brand compact light />
        <nav aria-label="Explore AICC">
          <a className="hover:text-indigo-700 hover:underline" href="#venues">Venues</a>
          <a className="hover:text-indigo-700 hover:underline" href="#booking">How to book</a>
          <a className="hover:text-indigo-700 hover:underline" href="#visit">Visit AICC</a>
        </nav>
        <AppearanceChoice />{dashboard
          ? <Link to={dashboard} className="btn-outline">My workspace <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
          : <Link to="/login" className="btn-outline">Sign in <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>}
      </div>
    </header>

    <main id="main-content" tabIndex={-1}>
      <section aria-labelledby="landing-title" className="public-hero">
        <div className="public-hero-copy">
          <p className="public-hero-location">
            <MapPinIcon className="h-4 w-4" aria-hidden="true" /> Addis Ababa, Ethiopia
          </p>
          <h1 id="landing-title">Addis International <em>Convention Center</em></h1>
          <p>Find the right space for your event, request a proposal, and manage your booking with AICC.</p>
          <div className="public-hero-actions">
            <a href="#plan" className="btn-primary">Find a venue <ArrowRightIcon className="h-4 w-4" aria-hidden="true"/></a>
            <a href="#booking">How booking works</a>
          </div>
        </div>
        <figure className="public-hero-photo">
          <img src={import.meta.env.BASE_URL + 'aicc-venue.jpg'} width="1200" height="674" fetchpriority="high"
            alt="Aerial view of the Addis International Convention Center at dusk"/>
          <figcaption><a href={photoSource}>Photo by Ethiopian News Agency</a></figcaption>
        </figure>
      </section>
      <section id="plan" aria-labelledby="plan-title" className={`${shell} public-search`}>
        <div className="public-search-panel">
          <div className="public-search-heading"><h2 id="plan-title">Find your venue</h2>
            {!currentUser && <p>Sign in to see your results.</p>}</div>
          {canPlan ? <EventPlanForm plan={{ eventType: 'conference' }}
            onSearch={query => navigate(`/client/venues?${query}`)}
            className="public-search-form">
            <button type="submit" disabled={loading} className="btn-primary">Find venues <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></button>
          </EventPlanForm> : <div className="py-4">
            <p className="mb-4 text-sm text-slate-700">Venue searches and inquiries are available in the client workspace.</p>
            <Link className="btn-outline" to={dashboard || '/login'}>Open my workspace <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
          </div>}
        </div>
      </section>

      <section id="booking" aria-labelledby="booking-title" className="scroll-mt-5 border-b border-[#dfe5dd] bg-[#eef2ed]">
        <div className={`${shell} py-12 sm:py-16`}>
          <div className="grid items-end gap-4 lg:grid-cols-[1fr_0.65fr]">
            <div>
              <p className="eyebrow mb-3">Booking your event</p>
              <h2 id="booking-title" className={sectionTitle}>What happens after an inquiry?</h2>
            </div>
            <p className="max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
              See what to expect from your first request through venue confirmation.
            </p>
          </div>
          <BookingWalkthrough />
          {canPlan && <Link to="/client/new-inquiry" className={`${subtleLink} mt-5`}>Start an inquiry <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>}
        </div>
      </section>

      <section id="venues" aria-labelledby="venues-title" className={`${shell} scroll-mt-5 py-14 sm:py-20`}>
        <div className="grid items-end gap-4 lg:grid-cols-[1fr_0.65fr]">
          <div>
            <p className="eyebrow mb-3">The convention center</p>
            <h2 id="venues-title" className={sectionTitle}>Spaces for every part of your program</h2>
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">Host the main program in a large hall, move into smaller rooms for breakouts, or take the event outdoors.</p>
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {spaces.map(({ name, detail, description, uses, icon: Icon, color }) => <li key={name} className="flex flex-col overflow-hidden rounded-2xl border border-[#dfe5dd] bg-white">
            <div className={`relative flex min-h-28 items-end justify-between overflow-hidden p-5 ${color}`}>
              <span className="relative z-10 text-xs font-bold uppercase tracking-[0.13em]">{detail}</span>
              <Icon className="absolute -right-2 -top-2 h-33 w-33 opacity-20" aria-hidden="true" />
            </div>
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <h3 className="text-xl font-semibold">{name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{description}</p>
              <p className="mt-5 border-t border-slate-100 pt-3 text-xs font-semibold text-indigo-800">{uses}</p>
            </div>
          </li>)}
        </ul>
        <dl className="mt-6 grid gap-x-6 gap-y-4 rounded-xl border border-[#dfe5dd] bg-[#f1f4ee] px-5 py-4 sm:grid-cols-3 sm:px-6">
          {amenities.map(([name, description]) => <div key={name}>
            <dt className="text-sm font-semibold">{name}</dt>
            <dd className="mt-1 text-sm text-slate-600">{description}</dd>
          </div>)}
        </dl>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <a href={venueProfile} className="text-xs text-slate-600 underline underline-offset-2">AICC venue profile on ICCA</a>
          {canPlan && <Link to="/client/venues" className={subtleLink}>Browse the venue directory <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>}
        </div>
      </section>

      <section id="visit" aria-labelledby="visit-title" className="scroll-mt-5 border-y border-[#dfe5dd] bg-[#eef2ed] py-14 sm:py-18">
        <div className={`${shell} grid gap-9 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16`}>
          <div>
            <p className="eyebrow mb-3">Location &amp; contact</p>
            <h2 id="visit-title" className={sectionTitle}>Visit AICC</h2>
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-slate-700">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
              <span>CMC roundabout<br />Addis Ababa, Ethiopia</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={directions} className="btn-primary">Get directions <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" /></a>
              <a href="mailto:marketing@aicc.et" className="btn-outline">Email AICC</a>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h3>
            <div className="mt-3 divide-y divide-[#ccd9d0] border-y border-[#ccd9d0]">
              {questions.map(([question, answer]) => <details key={question} className="group py-3">
                <summary className="flex list-none items-center justify-between gap-4 py-1 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {question}<PlusIcon className="h-4 w-4 shrink-0 text-indigo-700 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="max-w-xl pb-1 pt-2 text-sm leading-relaxed text-slate-700">{answer}</p>
              </details>)}
            </div>
          </div>
        </div>
      </section>

    </main>

    <footer className="bg-[#142f32] text-slate-200">
      <div className={`${shell} flex flex-wrap items-center justify-between gap-5 py-7`}>
        <Brand light />
        <p className="text-sm">Addis Ababa, Ethiopia</p>
        <a className="text-sm font-semibold text-[#efd392] hover:underline" href="#visit">Location &amp; contact</a>
      </div>
    </footer>
  </div>;
}
