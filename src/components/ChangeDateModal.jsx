import { useEffect, useState } from 'react';
import api from '../api/axios';

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ChangeDateModal({ isOpen, onClose, eventId, currentDate, onDateChanged }) {
  const [newDate, setNewDate] = useState(currentDate || '');
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewDate(currentDate || '');
      setImpact(null);
      setError('');
    }
  }, [isOpen, currentDate]);

  if (!isOpen) return null;

  const conflicts = impact?.vendorConflicts || [];
  const reconfirmations = impact?.needsReconfirmation || [];
  const hasConflicts = conflicts.length > 0 || impact?.venueAvailable === false;

  const checkImpact = async () => {
    setLoading(true);
    setImpact(null);
    setError('');
    try {
      const response = await api.get(`/events/${eventId}/impact`, { params: { newDate } });
      setImpact(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to analyze the date change.');
    } finally {
      setLoading(false);
    }
  };

  const confirmChange = async () => {
    if (!impact || hasConflicts) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/events/${eventId}/date`, null, { params: { newDate } });
      await onDateChanged?.(newDate);
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update the event date.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="change-date-title">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="change-date-title" className="text-xl font-bold text-slate-800">Change event date</h2>
            <p className="mt-1 text-sm text-slate-500">Check vendor and venue availability before rescheduling.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">×</button>
        </div>

        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="new-event-date">New date</label>
        <input
          id="new-event-date"
          type="date"
          min={localDateString(new Date())}
          value={newDate}
          onChange={event => { setNewDate(event.target.value); setImpact(null); setError(''); }}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={checkImpact}
          disabled={loading || !newDate || newDate === currentDate}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Analyzing…' : 'Analyze impact'}
        </button>

        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        {impact && (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className={`text-sm font-semibold ${impact.venueAvailable ? 'text-emerald-700' : 'text-rose-700'}`}>
              Venue {impact.venueAvailable ? 'is available' : 'is unavailable'} on {impact.newDate}.
            </div>
            {conflicts.length > 0 && (
              <div className="text-sm text-rose-700">
                <p className="font-semibold">Vendor conflicts</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">{conflicts.map((conflict, index) => <li key={`${index}-${conflict}`}>{conflict}</li>)}</ul>
              </div>
            )}
            {reconfirmations.length > 0 && (
              <div className="text-sm text-amber-700">
                <p className="font-semibold">Vendors must reconfirm</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">{reconfirmations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
              </div>
            )}
            {!hasConflicts && reconfirmations.length === 0 && (
              <p className="text-sm text-emerald-700">No conflicts found. The date can be changed.</p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            onClick={confirmChange}
            disabled={!impact || hasConflicts || saving || newDate === currentDate}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm change'}
          </button>
        </div>
      </section>
    </div>
  );
}
