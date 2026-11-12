
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import useApiResource from '../hooks/useApiResource';
import api from '../api/axios';

const time = value => value ? new Date(value).toLocaleString() : '—';

export default function BookingFollowups() {
  const { data, loading, error, reload } = useApiResource('/booking-followups');
  const [saving, setSaving] = useState(null);
  const [actionError, setActionError] = useState('');
  async function toggle(row) {
    setSaving(row.inquiryId);
    setActionError('');
    try {
      await api.patch('/booking-followups/' + row.inquiryId + '/pause', { paused: !row.paused });
      reload();
    } catch (failure) { setActionError(failure.response?.data?.message || 'Follow-up settings could not be saved.'); }
    finally { setSaving(null); }
  }
  return <Layout title="Booking follow-ups">
    <div className="space-y-6">
      <PageHeader eyebrow="Automatic follow-ups" title="Keep accepted bookings moving"
        subtitle="Signature, receipt, and verification reminders for inquiries you handle."
        action={<button className="btn-outline" onClick={reload}>Refresh</button>} />
      <p className="surface p-5 text-sm text-slate-600">The system checks outstanding actions every minute. Each action receives its own reminder cycle, then requests personal follow-up if it remains unresolved. Pausing suspends all automated reminders for the inquiry. Reminders are recorded here when queued. Email delivery outcomes are available in the administrator diagnostics.</p>
      {(error || actionError) && <p role="alert" className="text-rose-700">{error || actionError}</p>}
      {loading && <p role="status">Loading follow-ups…</p>}
      {!loading && !error && !data.length && <div className="surface p-8 text-center text-slate-500">No accepted inquiries need booking follow-up.</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {data.map(row => <article key={row.inquiryId} className={'surface border-t-4 p-5 ' + (row.escalatedAt ? 'border-t-rose-500' : row.paused ? 'border-t-slate-400' : 'border-t-indigo-500')}>
          <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Inquiry #{row.inquiryId}</p><h2 className="mt-1 text-lg font-semibold">{row.clientName}</h2></div>
            <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (row.paused ? 'bg-slate-100' : row.escalatedAt ? 'bg-rose-100 text-rose-800' : 'bg-indigo-50 text-indigo-800')}>{row.paused ? 'Paused' : row.escalatedAt ? 'Personal follow-up needed' : 'Tracking automatically'}</span></div>
          <p className="mt-4 text-sm font-semibold">Awaiting {row.action.toLowerCase()}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-slate-500">Reminders queued</dt><dd className="font-semibold">{row.reminders}</dd></div>
            <div><dt className="text-slate-500">Tracking started</dt><dd>{row.startedAt ? time(row.startedAt) : 'Next scheduled scan'}</dd></div>
            <div><dt className="text-slate-500">First reminder</dt><dd>{time(row.firstSentAt)}</dd></div>
            <div><dt className="text-slate-500">Latest reminder</dt><dd>{time(row.lastSentAt)}</dd></div>
            <div className="col-span-2"><dt className="text-slate-500">{row.escalatedAt ? 'Escalated' : 'Next follow-up'}</dt><dd>{row.paused ? 'Paused by coordinator' : time(row.escalatedAt || row.nextAt)}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn-primary" to={'/coordinator/inquiries/' + row.inquiryId}>Open inquiry</Link>
            <button className="btn-outline disabled:opacity-50" disabled={saving != null || Boolean(row.escalatedAt)} onClick={() => toggle(row)}>{row.paused ? 'Resume reminders' : 'Pause reminders'}</button>
          </div>
        </article>)}
      </div>
    </div>
  </Layout>;
}
