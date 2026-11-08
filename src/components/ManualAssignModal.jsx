import { useEffect, useState } from 'react';

export default function ManualAssignModal({ 
  isOpen, 
  onClose, 
  onAssign, 
  availableVendors = [],
  serviceCategory,
  loading = false,
  loadError = '',
  submitting = false,
  error = ''
}) {
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedVendorId('');
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const busy = loading || submitting;

  const handleAssign = () => {
    if (!selectedVendorId) {
      alert('Please select a vendor');
      return;
    }
    if (!reason.trim()) {
      alert('Please enter a reason for this coordinator assignment');
      return;
    }
    onAssign(selectedVendorId, reason.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div role="dialog" aria-modal="true" aria-labelledby="manual-assignment-title" className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 id="manual-assignment-title" className="text-lg font-semibold text-slate-100">Manual Vendor Assignment</h3>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close vendor assignment"
            className="text-slate-400 hover:text-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {serviceCategory && (
            <div>
              <p className="text-sm text-slate-400">Service Category</p>
              <p className="font-medium text-slate-100">{serviceCategory}</p>
            </div>
          )}

          <div>
            <label htmlFor="assignment-vendor" className="block text-sm font-medium text-slate-300 mb-2">
              Select Vendor
            </label>
            <select
              id="assignment-vendor"
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              disabled={busy}
            >
              <option value="">Choose a vendor...</option>
              {availableVendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.companyName || vendor.name} {vendor.rating ? `(${vendor.rating}★)` : ''}
                </option>
              ))}
            </select>
            {loading && <p role="status" className="mt-2 text-xs text-slate-400">Refreshing event-specific eligibility…</p>}
            {loadError && <p role="alert" className="mt-2 text-xs text-rose-300">{loadError}</p>}
            {!loading && !loadError && availableVendors.length === 0 && (
              <p className="mt-2 text-xs text-slate-400">No vendors currently pass the eligibility checks for this event.</p>
            )}
          </div>

          <div>
            <label htmlFor="assignment-reason" className="block text-sm font-medium text-slate-300 mb-2">
              Reason for coordinator override
            </label>
            <textarea
              id="assignment-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Why are you choosing this vendor?"
              className="w-full px-3 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              disabled={busy}
            />
          </div>

          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={busy || Boolean(loadError) || !selectedVendorId || !reason.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Assigning…' : 'Assign Vendor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
