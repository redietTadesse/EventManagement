import { useEffect, useState } from 'react';
import api from '../api/axios';

function parseDecisionSnapshot(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function VendorDecisionHistory({ eventId }) {
  const [trail, setTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    setLoading(true);
    setError('');
    setTrail(null);
    api.get(`/events/${eventId}/vendor-trail`)
      .then(res => { if (active) setTrail(res.data); })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Failed to load decision history'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventId]);

  if (!eventId) return null;

  return (
    <section id="vendor-decision-history" className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-slate-100 shadow-lg">
      <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-4 sm:px-6">
        <h2 className="text-lg font-bold text-slate-100">Decision history</h2>
        <p className="text-xs text-slate-400">Recorded vendor offers, rankings, exclusions, and outcomes</p>
      </div>

        <div className="space-y-6 p-4 sm:p-6">
          {loading && <div className="text-center text-gray-500">Loading trail...</div>}
          {error && <div className="text-rose-500">{error}</div>}
          
          {trail && trail.categories.length === 0 && !loading && (
            <p className="text-sm text-slate-400">No required vendor categories or assignment attempts are recorded for this event.</p>
          )}
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
                    {attempt.reason && (
                      <p className="text-xs text-indigo-300 mt-2">Decision: {attempt.reason}</p>
                    )}
                    {snapshot && (
                      <details open className="mt-3 border-t border-slate-800 pt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-indigo-300">
                          Review the recorded decision
                        </summary>
                        {snapshot.reasoning && (
                          <p className="text-xs text-slate-300 mt-2">{snapshot.reasoning}</p>
                        )}
                        {snapshot.eventDate && (
                          <p className="text-xs text-slate-400 mt-1">Decision evaluated for {snapshot.eventDate}.</p>
                        )}
                        {snapshot.actor?.username && (
                          <p className="text-xs text-slate-400 mt-1">
                            Assigned by {snapshot.actor.username}
                            {snapshot.actor.userId ? ` (user ${snapshot.actor.userId})` : ''}
                          </p>
                        )}
                        {(snapshot.considered || []).length > 0 && (
                          <div className="overflow-x-auto mt-2">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Eligible candidates ranked</p>
                            <div className="space-y-1">
                              {snapshot.considered.map((candidate, index) => (
                                <div key={`${candidate.vendorId || candidate.vendorName}-${index}`} className="rounded bg-slate-800/70 px-2 py-2 text-xs">
                                  <p className="text-slate-100">
                                    #{candidate.rank || index + 1} {candidate.vendorName || 'Unknown vendor'}
                                    {candidate.score != null && <span className="ml-2 text-slate-300">{candidate.score}% total score</span>}
                                    {candidate.status && <span className="ml-2 text-slate-400">{candidate.status}</span>}
                                  </p>
                                  {(candidate.qualityContribution != null || candidate.workloadContribution != null || candidate.rotationContribution != null) && (
                                    <p className="mt-1 text-[11px] text-slate-400">
                                      Weighted contributions: quality {candidate.qualityContribution ?? '—'}, workload {candidate.workloadContribution ?? '—'}, rotation {candidate.rotationContribution ?? '—'} percentage points.
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(snapshot.excluded || []).length > 0 && (
                          <div className="mt-3 space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-300">Excluded from this decision</p>
                            {snapshot.excluded.map((candidate, index) => (
                              <div key={`${candidate.vendorId || candidate.vendorName}-${index}`} className="rounded bg-rose-950/40 px-2 py-2 text-xs">
                                <span className="font-medium text-slate-100">{candidate.vendorName || 'Unknown vendor'}</span>
                                <span className="text-rose-200"> · {candidate.reason || 'Eligibility rule not recorded'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </details>
                    )}
                    {!snapshot && (
                      <p className="mt-2 text-xs text-slate-500">No ranking snapshot was recorded for this attempt.</p>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
    </section>
  );
}
