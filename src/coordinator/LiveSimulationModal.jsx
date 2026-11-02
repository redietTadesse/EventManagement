import { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  SparklesIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const SIMULATION_STAGES = [
  { label: 'Intake', detail: 'Inquiry received' },
  { label: 'Ranking', detail: 'AI scores vendors' },
  { label: 'Offers', detail: 'Vendors notified' },
  { label: 'Recovery', detail: 'Fallback selected' },
  { label: 'Confirmed', detail: 'Event ready' },
];

const EVENT = {
  name: 'Tech Gala',
  client: 'Aster Events',
  date: '18 Nov 2026',
  attendees: 500,
};

const SERVICES = [
  { name: 'Audio visual', shortName: 'AV', vendor: 'Elite AV' },
  { name: 'Security', shortName: 'Security', vendor: 'Addis Security' },
  { name: 'Event media', shortName: 'Media', vendor: 'MediaPro' },
];

const VENDORS = [
  {
    rank: 1,
    name: 'Elite AV',
    score: 0.92,
    quality: 0.96,
    workload: 0.83,
    rotation: 0.88,
    activeLoad: '8 / 10 active',
  },
  {
    rank: 2,
    name: 'Addis Security',
    score: 0.87,
    quality: 0.91,
    workload: 0.72,
    rotation: 0.84,
    activeLoad: '5 / 10 active',
  },
  {
    rank: 3,
    name: 'MediaPro',
    score: 0.81,
    quality: 0.86,
    workload: 0.61,
    rotation: 0.77,
    activeLoad: '3 / 10 active',
  },
];

const formatPercent = value => `${Math.round(value * 100)}%`;

function Panel({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-700 bg-slate-800/70 ${className}`}>
      {children}
    </section>
  );
}

function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-600 bg-slate-700/70 text-slate-300',
    indigo: 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200',
    sky: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
    amber: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    rose: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
    emerald: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

function ScoreBar({ label, subtitle, value, color }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <span className="font-semibold text-slate-100">{formatPercent(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-500">{subtitle}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-6 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-300">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function LifecycleRail({ step }) {
  const activeStage = step - 1;

  return (
    <div className="mb-7 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Automated lifecycle
        </p>
        <p className="text-xs font-medium text-indigo-300">
          {step === 5 ? 'Complete' : `Stage ${step} of 5`}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {SIMULATION_STAGES.map((stage, index) => {
          const completed = index < activeStage;
          const current = index === activeStage;

          return (
            <div key={stage.label} className="min-w-0">
              <div className="flex items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                    completed
                      ? 'bg-emerald-500 text-white'
                      : current
                        ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/15'
                        : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {completed ? '✓' : index + 1}
                </span>
                {index < SIMULATION_STAGES.length - 1 && (
                  <span
                    className={`mx-1 h-px flex-1 transition-colors sm:mx-2 ${
                      completed ? 'bg-emerald-500/70' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
              <p className={`mt-2 truncate text-[10px] font-semibold sm:text-xs ${
                current ? 'text-indigo-200' : completed ? 'text-slate-300' : 'text-slate-500'
              }`}>
                {stage.label}
              </p>
              <p className="hidden truncate text-[10px] text-slate-600 sm:block">{stage.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SystemAction({ children, done = false, active = false }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
      }`}>
        {done ? '✓' : active ? '•' : '○'}
      </span>
      <p className={`text-sm ${done || active ? 'text-slate-200' : 'text-slate-500'}`}>{children}</p>
    </div>
  );
}

function VendorCard({ vendor, status = 'available' }) {
  const declined = status === 'declined';
  const accepted = status === 'accepted';
  const border = declined
    ? 'border-rose-400/50 bg-rose-500/10'
    : accepted
      ? 'border-emerald-400/50 bg-emerald-500/10'
      : 'border-slate-700 bg-slate-900/30';

  return (
    <div className={`rounded-xl border p-4 transition-all ${border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            declined ? 'bg-rose-500 text-white' : accepted ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'
          }`}>
            #{vendor.rank}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{vendor.name}</p>
            <p className="text-xs text-slate-400">{vendor.activeLoad}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-300">Match</p>
          <p className="text-xl font-bold leading-none text-white">{formatPercent(vendor.score)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <ScoreBar label="Quality" subtitle="Client reviews" value={vendor.quality} color="bg-indigo-400" />
        <ScoreBar label="Load" subtitle="Current active events" value={vendor.workload} color="bg-amber-400" />
        <ScoreBar label="Rotation" subtitle="Fair vendor rotation" value={vendor.rotation} color="bg-sky-400" />
      </div>

      {declined && <div className="mt-4"><Badge tone="rose">Declined · schedule conflict</Badge></div>}
      {accepted && <div className="mt-4"><Badge tone="emerald">Accepted · fallback offer</Badge></div>}
    </div>
  );
}

function RankingWeights() {
  const weights = [
    { label: 'Quality', value: 50, color: 'bg-indigo-400' },
    { label: 'Load', value: 40, color: 'bg-amber-400' },
    { label: 'Rotation', value: 10, color: 'bg-sky-400' },
  ];

  return (
    <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-indigo-100">Decision formula</p>
        <Badge tone="indigo">15 vendors scanned</Badge>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {weights.map(weight => (
          <div key={weight.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <span className="text-indigo-100">{weight.label}</span>
              <span className="font-bold text-white">{weight.value}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/80">
              <div className={`h-full rounded-full ${weight.color}`} style={{ width: `${weight.value * 2}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadyStage({ onStart }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-300 shadow-2xl shadow-indigo-950/40">
        <SparklesIcon className="h-10 w-10" />
      </div>
      <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-300">
        Interactive automation replay
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
        See the system think.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
        One guided path from client inquiry to confirmed event, including ranking logic,
        vendor offers, conflict recovery, and the final audit trail.
      </p>

      <div className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-3">
        {[
          { value: '3', label: 'services detected' },
          { value: '15', label: 'vendors evaluated' },
          { value: '0', label: 'manual interventions' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-3">
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400"
      >
        <PlayIcon className="h-5 w-5" />
        Start live replay
      </button>
      <p className="mt-4 text-xs text-slate-500">The replay advances automatically. You can pause at any stage.</p>
    </div>
  );
}

function IntakeStage() {
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeading
        eyebrow="01 · Intake"
        title="The client request becomes a work plan"
        description="The system receives one inquiry and turns it into three trackable service requirements."
      />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-sky-300">Client inquiry</p>
              <h3 className="mt-2 text-xl font-bold text-white">{EVENT.name}</h3>
              <p className="mt-1 text-sm text-slate-400">Submitted by {EVENT.client}</p>
            </div>
            <Badge tone="sky">INQUIRY_SUBMITTED</Badge>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-900/60 p-3">
              <CalendarDaysIcon className="h-4 w-4 text-sky-300" />
              <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Event date</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">{EVENT.date}</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-3">
              <UserGroupIcon className="h-4 w-4 text-sky-300" />
              <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Attendees</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">{EVENT.attendees}</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-3">
              <SparklesIcon className="h-4 w-4 text-sky-300" />
              <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Event type</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">Tech gala</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-3">
              <CheckCircleIcon className="h-4 w-4 text-sky-300" />
              <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Requirements</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">3 services</p>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-700 pt-5">
            <p className="text-xs font-semibold text-slate-300">Detected service requirements</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {SERVICES.map(service => (
                <div key={service.name} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-[10px] font-bold text-sky-300">{service.shortName}</span>
                  <span className="text-sm font-medium text-slate-200">{service.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-300">System actions</p>
          <h3 className="mt-2 text-lg font-bold text-white">Workflow initialized</h3>
          <div className="mt-6 space-y-4">
            <SystemAction done>Inquiry validated and stored</SystemAction>
            <SystemAction done>Event profile created</SystemAction>
            <SystemAction done>Service requirements extracted</SystemAction>
            <SystemAction active>Eligibility checks queued</SystemAction>
          </div>
          <div className="mt-7 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
            <p className="text-xs font-semibold text-indigo-100">Next automatic action</p>
            <p className="mt-1 text-sm leading-5 text-indigo-200">Evaluate eligible vendors using quality, workload, and rotation.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function RankingStage() {
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeading
        eyebrow="02 · AI ranking"
        title="The selection engine makes the trade-off visible"
        description="Every eligible vendor receives a comparable score before the system sends an offer."
      />

      <div className="grid gap-4 lg:grid-cols-[.72fr_1.28fr]">
        <Panel className="p-5 sm:p-6">
          <RankingWeights />
          <div className="mt-5 space-y-4">
            <p className="text-xs font-semibold text-slate-300">Eligibility checks</p>
            <SystemAction done>Service category matches</SystemAction>
            <SystemAction done>Vendor is active and available</SystemAction>
            <SystemAction done>Capacity supports 500 attendees</SystemAction>
            <SystemAction done>No date conflict at ranking time</SystemAction>
          </div>
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-xs font-semibold text-slate-300">Ranking result</p>
            <p className="mt-1 text-sm leading-5 text-slate-400">Elite AV leads on the combined score. Addis Security is ready as the next-best fallback.</p>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-300">Ranked vendor pool</p>
              <p className="mt-1 text-sm text-slate-500">Top candidates after eligibility filtering</p>
            </div>
            <Badge tone="emerald">3 eligible shown</Badge>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {VENDORS.map(vendor => <VendorCard key={vendor.name} vendor={vendor} />)}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function OfferRow({ service, vendor, status = 'pending', declined = false, accepted = false }) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
      declined ? 'border-rose-400/40 bg-rose-500/10' : accepted ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/30'
    }`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-[10px] font-bold text-slate-200">{service.shortName}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{service.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">Offer routed to {vendor}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1 text-xs text-slate-500 sm:inline-flex"><ClockIcon className="h-3.5 w-3.5" />15 min window</span>
        <Badge tone={declined ? 'rose' : accepted ? 'emerald' : 'amber'}>{status}</Badge>
      </div>
    </div>
  );
}

function OffersStage() {
  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeading
        eyebrow="03 · Offer dispatch"
        title="The system coordinates the vendor wave"
        description="The ranked results become real offers, each tied to a service, deadline, and current lifecycle state."
      />

      <Panel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700 pb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-300">Assignment workflow</p>
            <h3 className="mt-2 text-xl font-bold text-white">Offers dispatched automatically</h3>
            <p className="mt-1 text-sm text-slate-400">Three required services · one ranked offer per service</p>
          </div>
          <Badge tone="amber">Awaiting vendor responses</Badge>
        </div>

        <div className="mt-5 space-y-3">
          <OfferRow service={SERVICES[0]} vendor="Elite AV" />
          <OfferRow service={SERVICES[1]} vendor="Addis Security" />
          <OfferRow service={SERVICES[2]} vendor="MediaPro" />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Offers created', '3 / 3'],
            ['Response window', '15 min'],
            ['Coordinator action', 'None'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-bold text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RecoveryStage() {
  const selectedVendor = VENDORS[1];

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeading
        eyebrow="04 · Conflict recovery"
        title="A decline triggers the fallback path"
        description="The system records the conflict, advances to the next eligible vendor, and preserves the exact decision evidence."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-300">Offer lifecycle</p>
              <p className="mt-1 text-sm text-slate-500">Audio visual service</p>
            </div>
            <Badge tone="rose">Conflict handled</Badge>
          </div>

          <div className="mt-6 space-y-3">
            <OfferRow service={SERVICES[0]} vendor="Elite AV" status="DECLINED" declined />
            <div className="flex items-center gap-3 px-4 text-xs font-semibold text-indigo-300">
              <ArrowPathIcon className="h-4 w-4" />
              Automatic escalation to next-ranked eligible vendor
            </div>
            <OfferRow service={SERVICES[0]} vendor="Addis Security" status="ACCEPTED" accepted />
          </div>

          <div className="mt-6 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-rose-300" />
              <div>
                <p className="text-sm font-semibold text-rose-100">Elite AV declined due to a scheduling conflict.</p>
                <p className="mt-1 text-xs leading-5 text-rose-200/70">The fallback path continued without a coordinator opening a manual assignment screen.</p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-300">Decision snapshot</p>
              <h3 className="mt-2 text-lg font-bold text-white">Why Addis Security?</h3>
            </div>
            <Badge tone="emerald">Recorded</Badge>
          </div>

          <div className="mt-5 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4">
            <p className="text-xs leading-5 text-indigo-100">Next-best eligible vendor after the original offer declined.</p>
            <p className="mt-3 text-3xl font-bold text-white">{formatPercent(selectedVendor.score)}</p>
            <p className="text-xs text-slate-400">Selection score</p>
          </div>

          <div className="mt-5 space-y-3">
            <ScoreBar label="Quality" subtitle="50% weight · client reviews" value={selectedVendor.quality} color="bg-indigo-400" />
            <ScoreBar label="Load" subtitle="40% weight · active workload" value={selectedVendor.workload} color="bg-amber-400" />
            <ScoreBar label="Rotation" subtitle="10% weight · fair distribution" value={selectedVendor.rotation} color="bg-sky-400" />
          </div>

          <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Recorded actor</p>
            <p className="mt-1 text-sm font-semibold text-amber-100">System automation</p>
            <p className="mt-1 text-xs text-amber-200/70">Fallback selected after decline · audit trail preserved</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ConfirmedStage({ onReplay }) {
  const auditItems = [
    ['Inquiry submitted', 'Tech Gala · 500 attendees'],
    ['Services detected', 'Audio visual · Security · Media'],
    ['Vendors ranked', 'Quality 50% · Load 40% · Rotation 10%'],
    ['Conflict recovered', 'Elite AV declined · Addis Security accepted'],
    ['Event confirmed', '3 / 3 services locked'],
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeading
        eyebrow="05 · Confirmation"
        title="The event is ready without manual intervention"
        description="The system closes the loop: every service is locked, the decision is explainable, and the audit trail is complete."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel className="flex flex-col items-center justify-center p-6 text-center sm:p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 shadow-2xl shadow-emerald-950/40">
            <CheckCircleIcon className="h-12 w-12" />
          </div>
          <Badge tone="emerald">EVENT_CONFIRMED</Badge>
          <h3 className="mt-4 text-3xl font-bold tracking-tight text-white">Tech Gala confirmed</h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">All 3 services locked. The coordinator was not required to intervene.</p>

          <div className="mt-7 grid w-full max-w-md grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-900/60 p-3">
              <p className="text-2xl font-bold text-emerald-300">3 / 3</p>
              <p className="mt-1 text-[10px] text-slate-500">services locked</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-3">
              <p className="text-2xl font-bold text-emerald-300">0</p>
              <p className="mt-1 text-[10px] text-slate-500">interventions</p>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-3">
              <p className="text-2xl font-bold text-emerald-300">100%</p>
              <p className="mt-1 text-[10px] text-slate-500">traceability</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReplay}
            className="mt-8 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <ArrowPathIcon className="h-5 w-5" />
            Replay from intake
          </button>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-300">Audit trail</p>
              <h3 className="mt-2 text-lg font-bold text-white">Decision evidence preserved</h3>
            </div>
            <Badge tone="indigo">5 events</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {auditItems.map(([title, detail], index) => (
              <div key={title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">✓</span>
                  {index < auditItems.length - 1 && <span className="mt-1 h-full min-h-5 w-px bg-slate-700" />}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-semibold text-slate-200">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-xs font-semibold text-slate-300">What this proves</p>
            <p className="mt-1 text-sm leading-5 text-slate-400">The platform does not just assign a vendor; it explains, adapts, and records why the final decision happened.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StageContent({ step, onStart, onReplay }) {
  if (step === 0) return <ReadyStage onStart={onStart} />;
  if (step === 1) return <IntakeStage />;
  if (step === 2) return <RankingStage />;
  if (step === 3) return <OffersStage />;
  if (step === 4) return <RecoveryStage />;
  return <ConfirmedStage onReplay={onReplay} />;
}

export default function LiveSimulationModal({ isOpen, onClose }) {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stageVisible, setStageVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setIsPlaying(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isPlaying || step === 0 || step >= 5) return undefined;

    const timer = window.setTimeout(() => {
      setStep(current => Math.min(current + 1, 5));
    }, 3800);

    return () => window.clearTimeout(timer);
  }, [isOpen, isPlaying, step]);

  useEffect(() => {
    if (step >= 5) setIsPlaying(false);
  }, [step]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setStageVisible(false);
    const frame = window.requestAnimationFrame(() => setStageVisible(true));

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const startSimulation = () => {
    setStep(1);
    setIsPlaying(true);
  };

  const nextStage = () => {
    setStep(current => Math.min(current + 1, 5));
  };

  const restartSimulation = () => {
    setStep(0);
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  const progress = step === 0 ? 0 : (step / 5) * 100;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/95 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-simulation-title"
    >
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 sm:min-h-[calc(100vh-3rem)]">
        <header className="border-b border-slate-800 bg-slate-900/95 px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Live automation replay</p>
                <h1 id="live-simulation-title" className="mt-1 text-lg font-bold text-white sm:text-xl">Event vendor orchestration</h1>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close live simulation"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Simulation progress</span>
              <span className="font-semibold text-indigo-300">
                {step === 0 ? 'Ready to start' : step === 5 ? 'Complete' : `${Math.round(progress)}% complete`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-10">
          <div
            key={step}
            className={`w-full transition-all duration-700 ease-out ${
              stageVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[.98] opacity-0'
            }`}
          >
            {step > 0 && <LifecycleRail step={step} />}
            <StageContent step={step} onStart={startSimulation} onReplay={restartSimulation} />
          </div>
        </main>

        <footer className="border-t border-slate-800 px-5 py-4 sm:px-8">
          {step > 0 && step < 5 ? (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className={`h-2 w-2 rounded-full ${isPlaying ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'}`} />
                {isPlaying ? 'Auto-playing · next stage in a few seconds' : 'Paused · review this stage at your pace'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(value => !value)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  {isPlaying ? 'Pause replay' : 'Resume replay'}
                </button>
                <button
                  type="button"
                  onClick={nextStage}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-400"
                >
                  <PlayIcon className="h-4 w-4" />
                  Next stage
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500">
              {step === 0 ? 'A deterministic frontend-only replay of the vendor coordination lifecycle.' : 'Lifecycle complete · zero manual intervention'}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
