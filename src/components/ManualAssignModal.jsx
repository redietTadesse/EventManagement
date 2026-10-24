import { useState } from 'react';

export default function ManualAssignModal({ 
  isOpen, 
  onClose, 
  onAssign, 
  availableVendors = [],
  serviceCategory,
  loading = false 
}) {
  const [selectedVendorId, setSelectedVendorId] = useState('');

  if (!isOpen) return null;

  const handleAssign = () => {
    if (!selectedVendorId) {
      alert('Please select a vendor');
      return;
    }
    onAssign(selectedVendorId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Manual Vendor Assignment</h3>
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
          {serviceCategory && (
            <div>
              <p className="text-sm text-gray-500">Service Category</p>
              <p className="font-medium text-gray-800">{serviceCategory}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vendor
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

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={loading || !selectedVendorId}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign Vendor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}