import { useState } from 'react';

export default function ConversionPreviewModal({ preview, onConfirm, onCancel, submitting }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  if (!preview) return null;

  const { venue, categories, eventDate, eventType, expectedAttendees, timelineEstimate } = preview;
  const venueInfo = venue || { available: false, message: 'No venue selected in proposal', venueName: 'Not specified' };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            Ready to convert: {eventType}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {eventDate} · {expectedAttendees} attendees · {categories.length} categories
          </p>
        </div>
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Venue</h3>
            <div className={`rounded-lg border p-3 ${venueInfo.available ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-100">
                    {venueInfo.venueName || 'Not specified'}
                  </p>
                  {venueInfo.capacity && (
                    <p className="text-xs text-slate-400">Capacity: {venue.capacity}</p>
                  )}
                  <p className={`text-sm mt-1 ${venueInfo.available ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {venue.available ? '✓ ' : '✗ '}{venue.message}
                  </p>
                  {!venue.available && (
                    <p className="text-xs text-rose-400 mt-2">
                      This venue was booked by another event. Converting will proceed
                      without a venue booking — you can assign a free venue afterwards.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Vendor assignments</h3>
            <div className="space-y-2">
              {categories.map((cat) => {
                const top = cat.candidates[0];
                const isExpanded = expandedCategory === cat.category;
                return (
                  <div key={cat.category} className="rounded-lg border border-slate-800 bg-slate-800/50">
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                      className="w-full text-left p-3 hover:bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100 uppercase text-sm">
                              {cat.category}
                            </span>
                            {top && (
                              <>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-800 font-medium">{top.companyName}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                  Rank #{top.rank}
                                </span>
                              </>
                            )}
                          </div>
                          {top && (
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                              <span>Score {(top.score * 100).toFixed(0)}%</span>
                              <span>·</span>
                              <span>Rating {top.rating ?? 'N/A'}/5</span>
                              <span>·</span>
                              <span>{top.currentLoad} active</span>
                              {top.hasRecentDecline && (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-600">⚠ declined recently</span>
                                </>
                              )}
                            </div>
                          )}
                          {cat.warning && (
                            <p className="text-xs text-amber-700 mt-1">⚠ {cat.warning}</p>
                          )}
                          {!top && (
                            <p className="text-xs text-rose-400 mt-1">No eligible vendors for this category</p>
                          )}
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-slate-800 p-3 space-y-2 bg-slate-900/30">
                        <p className="text-xs font-medium text-slate-400 mb-2">
                          Ranked alternatives (system will pick #1):
                        </p>
                        {cat.candidates.map((c) => (
                          <div key={c.vendorId} className="flex items-center justify-between text-sm bg-white rounded p-2">
                            <div>
                              <span className="font-medium text-slate-100">#{c.rank} {c.companyName}</span>
                              <span className="text-xs text-slate-400 ml-2">
                                score {(c.score * 100).toFixed(0)}% · rating {c.rating ?? 'N/A'}/5 · {c.currentLoad} active
                              </span>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-slate-400 italic mt-2">
                          If the top vendor declines, the system offers the next ranked candidate automatically.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
            <p className="text-sm text-blue-400">{timelineEstimate}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? 'Converting…' : 'Confirm and Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}

