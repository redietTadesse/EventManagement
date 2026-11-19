import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Dialog } from '@headlessui/react';

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
    <Dialog open onClose={() => { if (!submitting) onClose(); }} className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 p-4"><div className="flex min-h-full items-center justify-center">
      <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <Dialog.Title className="text-lg font-semibold text-slate-900">Report an event incident</Dialog.Title>
        <p className="mt-1 text-sm text-slate-600">
          This saves a confirmed report. A missed event also counts toward the vendor’s missed-event record. Check the details before submitting.
        </p>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="report-vendor" className="block text-xs font-medium text-slate-700 mb-1">
              Vendor
            </label>
            {loadingVendors ? (
              <p className="text-xs text-slate-500">Loading vendors…</p>
            ) : assignments.length === 0 ? (
              <p className="text-xs text-rose-700">No reportable vendors for this event.</p>
            ) : (
              <select
                id="report-vendor"
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
            <label htmlFor="report-type" className="block text-xs font-medium text-slate-700 mb-1">
              What happened?
            </label>
            <select
              id="report-type"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="NO_SHOW">Vendor did not attend</option>
              <option value="LATE">Late Arrival</option>
              <option value="DAMAGE">Property Damage</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-notes" className="block text-xs font-medium text-slate-700 mb-1">
              Supporting details
            </label>
            <textarea
              id="report-notes"
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
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !vendorId}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Save confirmed report'}
            </button>
          </div>
        </form>
      </Dialog.Panel>
    </div></Dialog>
  );
}