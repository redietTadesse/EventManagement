import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function CoordinatorReportModal({ event, onClose, onSaved }) {
  const [assignments, setAssignments] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [incidentType, setIncidentType] = useState('NO_SHOW');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingVendors, setLoadingVendors] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/assignments/event/${event.id}`);
        if (cancelled) return;
        // Only vendors that were actually accepted/completed
        const reportable = (data || []).filter(a =>
          a.vendorId && ['ACCEPTED', 'COMPLETED'].includes(a.status)
        );
        setAssignments(reportable);
      } catch {
        if (!cancelled) setError('Could not load vendors for this event.');
      } finally {
        if (!cancelled) setLoadingVendors(false);
      }
    })();
    return () => { cancelled = true; };
  }, [event.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) { setError('Select a vendor first'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/incidents/coordinator-report', {
        eventId: event.id,
        vendorId: Number(vendorId),
        incidentType,
        notes: notes.trim() || null,
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Report Incident</h3>
        <p className="mt-1 text-sm text-slate-600">
          Coordinator reports are <strong>auto-confirmed</strong> and count as a strike
          immediately — because you observed the event directly.
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Vendor
            </label>
            {loadingVendors ? (
              <p className="text-xs text-slate-500">Loading vendors…</p>
            ) : assignments.length === 0 ? (
              <p className="text-xs text-rose-700">No reportable vendors for this event.</p>
            ) : (
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                required
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">— Choose a vendor —</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.vendorId}>
                    {a.vendorName} ({a.serviceCategory})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Incident Type
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="NO_SHOW">No-Show (strike)</option>
              <option value="LATE">Late Arrival</option>
              <option value="DAMAGE">Property Damage</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. Vendor's staff never arrived at the venue; no contact made"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !vendorId}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'File & Confirm Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}