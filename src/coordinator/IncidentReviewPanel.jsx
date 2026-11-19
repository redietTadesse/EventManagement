import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const INCIDENT_LABELS = {
  NO_SHOW: { label: 'No-Show', className: 'bg-red-100 text-red-800' },
  LATE: { label: 'Late Arrival', className: 'bg-amber-100 text-amber-800' },
  DAMAGE: { label: 'Property Damage', className: 'bg-orange-100 text-orange-800' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function IncidentReviewPanel() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/incidents/pending');
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleConfirm = async (report) => {
    if (!window.confirm(`Confirm this report for ${report.vendorName}?${report.incidentType === "NO_SHOW" ? " This records a confirmed missed event." : " This confirms the reported incident."}`)) return;
    setSubmitting(report.id);
    setFeedback(null);
    try {
      await api.post(`/incidents/${report.id}/confirm`);
      setFeedback({ type: 'success', message: `Report confirmed for ${report.vendorName}.` });
      await load();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to confirm report' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleReject = async (report) => {
    setSubmitting(report.id);
    setFeedback(null);
    try {
      await api.post(`/incidents/${report.id}/reject`, { reason: rejectReason || null });
      setFeedback({ type: 'success', message: `Rejected. No strike recorded for ${report.vendorName}.` });
      setRejectingId(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to reject report' });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Layout title="Incident Reviews">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="After the event" title="Incident reviews" subtitle="Check the facts behind client reports. Confirmed reports become part of the vendor’s performance record." />

        {feedback && (
          <div role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`rounded-lg border p-3 text-sm ${feedback.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {feedback.message}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${reports.length} pending report${reports.length === 1 ? '' : 's'}`}
          </p>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {!loading && !error && reports.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">No pending reports. All caught up.</p>
          </div>
        )}

        <ul className="space-y-3">
          {reports.map(report => {
            const meta = INCIDENT_LABELS[report.incidentType]
              || { label: report.incidentType || 'Incident', className: 'bg-slate-100 text-slate-700' };
            const isRejecting = rejectingId === report.id;
            const busy = submitting === report.id;
            const isCommentFlag = report.source === 'COMMENT_FLAG';

            return (
              <li key={report.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                        {meta.label}
                      </span>
                      <h2 className="text-sm font-semibold text-slate-900">
                        {report.vendorName || `Vendor #${report.vendorId}`}
                      </h2>
                      <span className="text-xs text-slate-500">
                        · Event: <span className="font-medium text-slate-700">
                          <Link className="underline underline-offset-4" to={`/coordinator/events/${report.eventId}`}>{report.eventName || `#${report.eventId}`}</Link>
                        </span>
                      </span>
                      {isCommentFlag && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          ⚠ Suggested by review text
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Filed {formatDate(report.createdAt)}</p>
                    {report.notes && (
                      <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {isCommentFlag ? 'Auto-flag details: ' : 'Client notes: '}
                        </span>
                        {report.notes}
                      </p>
                    )}
                    {isCommentFlag && (
                      <p className="mt-1 text-xs italic text-amber-700">
                        The client’s review text suggested a missed event.
                        Check the facts with the client and vendor before confirming.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirm(report)}
                      disabled={busy || isRejecting}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy && !isRejecting ? 'Saving…' : 'Confirm report'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(isRejecting ? null : report.id);
                        setRejectReason('');
                      }}
                      disabled={busy}
                      className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {isRejecting ? 'Cancel' : 'Reject'}
                    </button>
                  </div>
                </div>

                {isRejecting && (
                  <div className="mt-3 space-y-2 rounded-lg border border-rose-200 bg-rose-50/40 p-3">
                    <label htmlFor={`reject-reason-${report.id}`} className="block text-xs font-medium text-slate-700">
                      Reason for rejection (optional)
                    </label>
                    <textarea
                      id={`reject-reason-${report.id}`}
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="e.g. Vendor showed proof of attendance; client mistaken"
                    />
                    <button
                      type="button"
                      onClick={() => handleReject(report)}
                      disabled={busy}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {busy ? 'Rejecting…' : 'Confirm Rejection'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Layout>
  );
}