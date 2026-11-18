import { useState } from 'react';
import api from '../api/axios';

export default function NoShowReportButton({ eventId, assignment, onReported }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/events/${eventId}/report`, {
        vendorId: assignment.vendorId,
        incidentType: 'NO_SHOW',
        notes: notes.trim() || null,
      });
      setOpen(false);
      if (onReported) onReported(assignment.id);
    } catch (err) {
      const code = err.response?.data?.code;
      const message = err.response?.data?.message || 'Failed to submit report.';
      // If already reported previously (page reload), treat as success
      if (code === 'DUPLICATE_REPORT' || message.toLowerCase().includes('awaiting coordinator')) {
        setOpen(false);
        if (onReported) onReported(assignment.id);
        return;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-red-600 underline hover:text-red-700"
      >
        Report no-show: {assignment.vendorName}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4">
      <h4 className="mb-2 font-bold text-red-800">
        Report no-show: {assignment.vendorName}
      </h4>
      <p className="mb-3 text-xs text-gray-700">
        This will be sent to a coordinator for review. It will <strong>not</strong> count
        against the vendor until a coordinator confirms it.
      </p>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        What happened? (optional)
      </label>
      <textarea
        rows={3}
        className="w-full rounded-lg border px-3 py-2 text-sm"
        placeholder="e.g. Vendor never arrived and did not respond to calls"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit to Coordinator'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(''); }}
          disabled={submitting}
          className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}