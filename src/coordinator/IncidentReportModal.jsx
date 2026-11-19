
import { useState } from 'react';
import api from '../api/axios';

export default function IncidentReportModal({
  event,
  assignments,
  onClose,
  onSuccess
}) {
  const [vendorId, setVendorId] = useState('');
  const [incidentType, setIncidentType] = useState('NO_SHOW');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post(`/events/${event.id}/report`, {
        vendorId: Number(vendorId),
        incidentType,
        notes
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to submit report'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-1">
          Report Incident
        </h3>

        <p className="text-sm text-gray-500 mb-4">
          Log a performance issue for {event.name}
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Vendor
            </label>

            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">-- Choose a vendor --</option>

              {assignments.map((a) => (
                <option key={a.id} value={a.vendorId}>
                  {a.vendorName} ({a.serviceCategory})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Incident Type
            </label>

            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NO_SHOW">
                No Show (3 strikes = auto-flag)
              </option>
              <option value="LATE">Late Arrival</option>
              <option value="DAMAGE">Property Damage</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Details
            </label>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              rows="3"
              placeholder="e.g. Vendor arrived 2 hours late without calling..."
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
