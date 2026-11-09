import { Link, Navigate } from 'react-router-dom';
import {
  ArrowDownIcon, ArrowUpRightIcon, BuildingOfficeIcon, CalendarDaysIcon,
  ClipboardDocumentListIcon, DocumentCheckIcon, DocumentTextIcon, InboxArrowDownIcon,
  MapPinIcon, ShieldCheckIcon, TicketIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../context/AppContext';
import { ROLE_DASHBOARDS } from '../utils/roles';
import Brand from './Brand';

const portals = [
  { id: 'client', title: 'Client', icon: BuildingOfficeIcon, tone: 'bg-indigo-50 text-indigo-700',
    description: 'Request an event, review proposals, and follow your booking.' },
  { id: 'coordinator', title: 'Coordinator', icon: ClipboardDocumentListIcon, tone: 'bg-blue-50 text-blue-800',
    description: 'Prepare proposals, verify receipts, and coordinate event delivery.' },
  { id: 'vendor', title: 'Vendor', icon: UserGroupIcon, tone: 'bg-violet-50 text-violet-800',
    description: 'Review service offers and manage accepted assignments.' },
  { id: 'admin', title: 'Admin', icon: ShieldCheckIcon, tone: 'bg-amber-50 text-amber-800',
    description: 'Monitor revenue, track venue demand, and manage vendor records.' },
];

const steps = [
  ['Inquiry', 'Share dates and requirements.', InboxArrowDownIcon],
  ['Proposal', 'Review the venue, scope, and quote.', DocumentTextIcon],
  ['Contract & payment', 'Sign and submit a receipt.', DocumentCheckIcon],
  ['Booking', 'Verify payment and reserve the venue.', CalendarDaysIcon],
  ['Event delivery', 'Confirm vendors and track preparation.', TicketIcon],
];

export default function PortalSelect() {
  const { state: { currentUser, loading } } = useApp();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-600" role="status">
      Loading your workspace…
    </div>;
  }
  if (currentUser) return <Navigate to={ROLE_DASHBOARDS[currentUser.role] || '/login'} replace />;

  return (
    <div className="min-h-screen bg-[#f5f6f4]">
      <a className="skip-link" href="#workspaces">Skip to workspaces</a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Brand />
          <a href="#workspaces" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
            Workspaces <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-12 pt-5 sm:px-8 sm:pt-8">
        <section className="overflow-hidden rounded-[1.5rem] bg-[#142f32] text-white lg:grid lg:grid-cols-[0.93fr_1.07fr]" aria-labelledby="landing-title">
          <div className="flex flex-col items-start justify-center p-6 sm:p-10 xl:p-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-emerald-200 sm:text-xs">
              Addis International Convention Center
            </p>
            <h1 id="landing-title" className="mt-5 max-w-[14ch] text-4xl font-semibold leading-[1.03] tracking-tight sm:text-6xl">
              From inquiry to event day
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-200 sm:text-base">
              Manage proposals, contracts, venue bookings, and event preparation in one place.
            </p>
            <a href="#workspaces" className="mt-7 inline-flex min-h-11 items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-900 hover:bg-emerald-50">
              Choose your workspace <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <figure className="relative min-h-50 bg-[#213d3d] sm:min-h-64 lg:min-h-full">
            <img src={import.meta.env.BASE_URL + 'aicc-venue.jpg'} width="1200" height="674"
              alt="Aerial view of the Addis International Convention Center and surrounding city at dusk"
              fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[50%_58%]" />
            <figcaption className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-slate-950/90 to-transparent px-5 pb-4 pt-9 text-xs text-white">
              <span className="inline-flex items-center gap-1.5"><MapPinIcon className="h-4 w-4" aria-hidden="true" />Addis Ababa, Ethiopia</span>
              <a href="https://www.ena.et/web/eng/w/eng_6075186" className="text-slate-100 underline underline-offset-2">Photo: Ethiopian News Agency</a>
            </figcaption>
          </figure>
        </section>

        <section id="workspaces" tabIndex={-1} aria-labelledby="workspaces-title" className="mt-8 scroll-mt-5 sm:mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div><p className="eyebrow">Sign in by role</p>
              <h2 id="workspaces-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Choose your workspace</h2></div>
            <Link to="/vendor-application" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:underline">
              Apply as a vendor <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {portals.map(({ id, title, icon: Icon, tone, description }) => (
              <li key={id}>
                <Link to={`/login/${id}`} className="surface group flex h-full flex-col p-5 hover:border-indigo-300 hover:shadow-card-hover">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <ArrowUpRightIcon className="h-4 w-4 text-slate-400 group-hover:text-indigo-700" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="workflow-title" className="surface mt-8 p-5 sm:mt-10 sm:p-6">
          <p className="eyebrow">How it works</p>
          <h2 id="workflow-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-900">The event journey</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map(([title, description, Icon], index) => (
              <li key={title} className="border-t border-slate-200 pt-3">
                <div className="mb-2 flex items-center gap-2 text-indigo-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs font-semibold tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-5 py-5 text-xs text-slate-500 sm:px-8">
          <span>AICC · Event management</span><span>Addis Ababa, Ethiopia</span>
        </div>
      </footer>
    </div>
  );
}
