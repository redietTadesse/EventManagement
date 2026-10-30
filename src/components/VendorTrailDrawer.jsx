import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';

function parseDecisionSnapshot(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-md bg-slate-900 text-slate-100 h-full shadow-2xl border border-slate-800 flex flex-col animate-slide-in">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Vendor Trail</h2>
            <p className="text-xs text-slate-400">Full escalation history</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full">
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading && <div className="text-center text-gray-500">Loading trail...</div>}
          {error && <div className="text-rose-500">{error}</div>}
          
          {trail && trail.categories.map(cat => (
            <div key={cat.category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-100 uppercase text-sm">{cat.category}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  cat.state === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' :
                  cat.state === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-rose-500/20 text-rose-400'
                }`}>
                  {cat.state}
                </span>
              </div>
              
              <div className="space-y-2">
                {cat.attempts.map(attempt => {
                  const snapshot = parseDecisionSnapshot(attempt.decisionSnapshot);
                  const candidates = [
                    ...(snapshot?.considered || []),
                    ...(snapshot?.excluded || [])
                  ];
                  return (
                  <div key={attempt.assignmentId || attempt.attemptNumber} className="bg-slate-900/30 border border-slate-800 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm text-slate-100">{attempt.vendorName || 'Vendor Pool'}</span>
                      <span className="text-xs font-semibold text-slate-400">{attempt.status}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{attempt.outcome}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {attempt.offeredAt && <span>Offered {new Date(attempt.offeredAt).toLocaleDateString()}</span>}
                      {attempt.expiresAt && <span>Expires {new Date(attempt.expiresAt).toLocaleDateString()}</span>}
                    </div>
                    {attempt.declineReason && (
                      <p className="text-xs text-rose-400 mt-2 italic">"{attempt.declineReason}"</p>
                    )}
                    {snapshot && (
                      <details className="mt-3 border-t border-slate-800 pt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-indigo-300">
                          Why this vendor was selected
                        </summary>
                        {snapshot.reasoning && (
                          <p className="text-xs text-slate-300 mt-2">{snapshot.reasoning}</p>
                        )}
                        {snapshot.actor?.username && (
                          <p className="text-xs text-slate-400 mt-1">
                            Assigned by {snapshot.actor.username}
                            {snapshot.actor.userId ? ` (user ${snapshot.actor.userId})` : ''}
                          </p>
                        )}
                        {candidates.length > 0 && (
                          <div className="overflow-x-auto mt-2">
                            <table className="w-full text-xs text-left">
                              <thead className="text-slate-500">
                                <tr>
                                  <th className="py-1 pr-2">Vendor</th>
                                  <th className="py-1 pr-2">Score</th>
                                  <th className="py-1">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {candidates.map((candidate, index) => (
                                  <tr key={`${candidate.vendorId || candidate.vendorName}-${index}`} className="border-t border-slate-800">
                                    <td className="py-1 pr-2 text-slate-200">{candidate.vendorName || 'Unknown vendor'}</td>
                                    <td className="py-1 pr-2 text-slate-300">
                                      {candidate.score == null ? '—' : `${candidate.score}/100`}
                                    </td>
                                    <td className="py-1 text-slate-300">
                                      {candidate.status || 'Unavailable'}
                                      {candidate.reason ? ` · ${candidate.reason}` : ''}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </details>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
