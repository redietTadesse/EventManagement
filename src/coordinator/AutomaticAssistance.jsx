
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, CheckCircleIcon, BellIcon, ClipboardDocumentListIcon, UsersIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import useApiResource from '../hooks/useApiResource';

const groups = [
  { key: 'VENDORS', title: 'Finding vendors', icon: UsersIcon, description: 'Eligible replacements are offered the work when a vendor declines or misses a deadline.' },
  { key: 'REMINDERS', title: 'Following up on bookings', icon: BellIcon, description: 'Clients and coordinators are reminded about signatures, receipts, and verification.' },
  { key: 'PREPARATION', title: 'Planning preparation', icon: ClipboardDocumentListIcon, description: 'Preparation tasks and their deadlines are created from the event type.' },
];

export default function AutomaticAssistance() {
  const resource = useApiResource('/automatic-assistance');
  const [filter, setFilter] = useState('ALL');
  const overview = resource.data?.activity ? resource.data : null;
  const activity = overview?.activity || [];
  const shown = filter === 'ALL' ? activity : activity.filter(item => item.category === filter);

  return <Layout title="Automatic assistance">
    <div className="space-y-6">
      <PageHeader eyebrow="Your coordination workspace" title="A little less chasing."
        subtitle="See the work the system has taken care of for your inquiries and events."
        action={<button type="button" className="btn-outline" onClick={resource.reload}><ArrowPathIcon className="h-4 w-4" />Refresh</button>} />
      <section className="overflow-hidden rounded-2xl bg-[#173b3b] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Working in the background</p>
            <h2 className="mt-2 font-serif text-2xl">Vendor offers, booking reminders, preparation plans.</h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-50">You stay in control of decisions. Open any recorded action to see the related booking and decide what to do next.</p>
          </div>
          <Link className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[#173b3b] hover:bg-emerald-50" to="/coordinator/follow-ups">Manage booking reminders</Link>
        </div>
      </section>

      {resource.error && <p role="alert" className="surface p-5 text-rose-700">Recent activity could not be loaded. Refresh to try again.</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {groups.map(group => {
          const Icon = group.icon;
          const count = activity.filter(item => item.category === group.key).length;
          return <button key={group.key} type="button" onClick={() => setFilter(filter === group.key ? 'ALL' : group.key)}
            aria-pressed={filter === group.key} className={'surface p-5 text-left transition hover:border-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ' + (filter === group.key ? 'ring-2 ring-indigo-500' : '')}>
            <Icon className="h-6 w-6 text-indigo-700" aria-hidden="true" />
            <h2 className="mt-4 font-semibold text-slate-900">{group.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{group.description}</p>
            <p className="mt-4 text-xs font-semibold text-indigo-700">{overview ? count + ' in recent activity' : resource.error ? 'Activity unavailable' : 'Loading activity…'}</p>
          </button>;
        })}
      </div>

      <section className="surface overflow-hidden" aria-labelledby="assistance-history">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div><h2 id="assistance-history" className="font-semibold text-slate-900">What happened recently</h2>
            <p className="mt-1 text-xs text-slate-500">Latest 50 recorded actions for work you currently handle. Recording starts with this update.</p></div>
          {filter !== 'ALL' && <button className="text-sm font-medium text-indigo-700 underline" onClick={() => setFilter('ALL')}>Show all activity</button>}
        </div>
        {resource.loading && <p role="status" className="p-6 text-sm text-slate-600">Loading recent actions…</p>}
        {!resource.loading && !resource.error && !shown.length && <div className="p-10 text-center">
          <CheckCircleIcon className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
          <p className="mt-3 font-medium text-slate-900">No recorded actions yet</p>
          <p className="mt-2 text-sm text-slate-500">New vendor offers, preparation plans, and booking reminders will appear here as they happen.</p>
        </div>}
        <ol className="divide-y divide-slate-100">{shown.map(item => {
          const group = groups.find(group => group.key === item.category);
          const Icon = group?.icon || CheckCircleIcon;
          return <li key={item.id} className="flex items-start gap-4 px-5 py-5">
            <span className={'mt-0.5 rounded-full p-2 ' + (item.needsAttention ? 'bg-amber-50 text-amber-800' : 'bg-indigo-50 text-indigo-700')}><Icon className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{item.title}</h3><time dateTime={item.createdAt} className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time></div>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.detail}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                {item.needsAttention && <span className="rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-900">Personal follow-up was requested</span>}
                <Link className="font-semibold text-indigo-700 hover:underline" to={item.eventId ? '/coordinator/events/' + item.eventId + '?tab=' + (item.category === 'PREPARATION' ? 'tasks' : 'vendors') : '/coordinator/inquiries/' + item.inquiryId}>{item.eventId ? 'View event' : 'View inquiry'} →</Link>
              </div>
            </div>
          </li>;
        })}</ol>
      </section>
      {overview && <details className="surface p-5 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700">How automatic assistance works</summary>
        <div className="mt-4 space-y-3 leading-relaxed text-slate-600">
          <p>Vendor offers allow {overview.vendorHours} hours for a response. Up to three ranked backups are tried before coordinator review is requested. Offers already issued keep their recorded deadlines.</p>
          <p>{overview.remindersEnabled ? 'Booking reminders run every ' + overview.reminderHours + ' hours, with up to ' + overview.reminderLimit + ' reminders per outstanding action before personal follow-up is requested.' : 'Automatic booking reminders are currently disabled.'} You can pause or resume reminders for each inquiry you handle.</p>
          <p>Preparation plans add missing tasks while preserving existing work and coordinator edits.</p>
          <p>The administrator can check email delivery if a reminder has not arrived.</p>
          <Link className="inline-block font-semibold text-indigo-700 underline" to="/coordinator/follow-ups">View reminder schedules and pause controls</Link>
        </div>
      </details>}
    </div>
  </Layout>;
}
