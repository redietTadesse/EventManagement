import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import RatingStars from './RatingStars';

function parseSnapshot(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function VendorPerformanceModal({ vendorId, onClose }) {
  const [performance, setPerformance] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!vendorId) return undefined;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get(`/vendors/${vendorId}/performance`),
      api.get(`/vendors/${vendorId}/assignments`),
    ])
      .then(([performanceResponse, assignmentResponse]) => {
        if (cancelled) return;
        setPerformance(performanceResponse.data);
        setAssignments(assignmentResponse.data || []);
        setError('');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this vendor profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [vendorId]);

  const decision = useMemo(() => {
    const latest = [...assignments]
      .filter(assignment => assignment.decisionSnapshot)
      .sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0))[0];
    return latest ? parseSnapshot(latest.decisionSnapshot) : null;
  }, [assignments]);

  const decisionRows = [
    ...(decision?.considered || []),
    ...(decision?.excluded || []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="vendor-performance-title">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-6">
          <div>
            <h2 id="vendor-performance-title" className="text-2xl font-bold text-slate-800">
              {performance?.companyName || 'Vendor profile'}
            </h2>
            {performance && (
              <div className="mt-2 flex items-center gap-2">
                <RatingStars rating={performance.averageRating || 0} readonly />
                <span className="text-sm font-medium text-slate-600">{Number(performance.averageRating || 0).toFixed(1)} / 5</span>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close vendor profile">×</button>
        </header>

        <div className="space-y-7 p-6">
          {loading && <p className="py-8 text-center text-sm text-slate-500">Loading vendor profile…</p>}
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
          {!loading && performance && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ['Completed', performance.completedAssignments, 'bg-emerald-50 text-emerald-700'],
                  ['Accepted', performance.acceptedAssignments, 'bg-indigo-50 text-indigo-700'],
                  ['Declined', performance.declinedAssignments, 'bg-rose-50 text-rose-700'],
                  ['Total reviews', performance.totalReviews, 'bg-amber-50 text-amber-700'],
                ].map(([label, value, color]) => (
                  <div key={label} className={`rounded-xl border border-slate-100 p-4 text-center ${color}`}>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="mt-1 text-xs font-medium">{label}</p>
                  </div>
                ))}
              </div>

              <section>
                <h3 className="mb-3 text-base font-semibold text-slate-800">Why the system ranked them here</h3>
                {!decision ? (
                  <p className="text-sm text-slate-500">No assignment decision snapshot is available yet.</p>
                ) : (
                  <>
                    {decision.reasoning && <p className="mb-3 text-sm text-slate-600">{decision.reasoning}</p>}
                    {decisionRows.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Vendor</th>
                              <th className="px-4 py-3">Score</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {decisionRows.map((candidate, index) => (
                              <tr key={`${candidate.vendorId || candidate.vendorName}-${index}`}>
                                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{candidate.vendorName || 'Unknown vendor'}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{candidate.score == null ? '—' : `${candidate.score}%`}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{candidate.status || 'Ranked'}</td>
                                <td className="px-4 py-3 text-slate-500">{candidate.reason || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="text-sm text-slate-500">No candidate breakdown was recorded.</p>}
                  </>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-base font-semibold text-slate-800">Recent reviews</h3>
                {(performance.recentReviews || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No reviews yet.</p>
                ) : (
                  <div className="space-y-3">
                    {performance.recentReviews.map((review, index) => (
                      <article key={review.assignmentId || index} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <RatingStars rating={review.rating || 0} readonly />
                          <time className="text-xs text-slate-400">
                            {review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : 'Date unavailable'}
                          </time>
                        </div>
                        {review.comment && <p className="mt-2 text-sm text-slate-700">“{review.comment}”</p>}
                        <p className="mt-2 text-xs text-slate-500">
                          {review.clientName || 'Client'}{review.eventName ? ` · ${review.eventName}` : ''}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
