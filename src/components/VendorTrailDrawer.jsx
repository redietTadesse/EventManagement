import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';

export default function VendorTrailDrawer({ isOpen, onClose, eventId }) {
  const [trail, setTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !eventId) return;
    setLoading(true);
    api.get(`/events/${eventId}/vendor-trail`)
      .then(res => setTrail(res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load trail'))
      .finally(() => setLoading(false));
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Vendor Trail</h2>
            <p className="text-xs text-gray-500">Full escalation history</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && <div className="text-center text-gray-500">Loading trail...</div>}
          {error && <div className="text-rose-500">{error}</div>}
          
          {trail && trail.categories.map(cat => (
            <div key={cat.category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800 uppercase text-sm">{cat.category}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  cat.state === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
                  cat.state === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {cat.state}
                </span>
              </div>
              
              <div className="space-y-2">
                {cat.attempts.map(attempt => (
                  <div key={attempt.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm text-gray-800">{attempt.vendorName || 'Vendor Pool'}</span>
                      <span className="text-xs font-semibold text-gray-500">{attempt.status}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{attempt.outcome}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {attempt.offeredAt && <span>Offered {new Date(attempt.offeredAt).toLocaleDateString()}</span>}
                      {attempt.expiresAt && <span>Expires {new Date(attempt.expiresAt).toLocaleDateString()}</span>}
                    </div>
                    {attempt.declineReason && (
                      <p className="text-xs text-rose-600 mt-2 italic">"{attempt.declineReason}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}