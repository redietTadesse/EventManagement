import { useEffect, useState } from 'react';

export default function ForceAssignModal({ 
  isOpen, 
  onClose, 
  onForceAssign, 
  availableVendors = [],
  assignment,
  loading = false 
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

  const handleForceAssign = () => {
    if (!selectedVendorId) {
      alert('Please select a vendor');
      return;
    }
    if (!reason.trim()) {
      alert('Please enter a reason for this coordinator assignment');
      return;
    }
    onForceAssign(selectedVendorId, reason.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Force Assign Vendor</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {assignment && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Assignment Details</p>
              <p className="font-medium text-gray-800">{assignment.eventName}</p>
              <p className="text-sm text-gray-600">{assignment.serviceCategory}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vendor to Force Assign
            </label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            >
              <option value="">Choose a vendor...</option>
              {availableVendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.companyName || vendor.name} {vendor.rating ? `(${vendor.rating}★)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for coordinator override
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Why are you choosing this vendor?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> This will override the automatic vendor assignment process and force the selected vendor to this assignment.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleForceAssign}
              disabled={loading || !selectedVendorId || !reason.trim()}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Force Assigning...' : 'Force Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
