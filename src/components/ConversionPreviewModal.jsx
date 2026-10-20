import { useState } from 'react';

export default function ConversionPreviewModal({ preview, onConfirm, onCancel, submitting }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  if (!preview) return null;

  const { venue, categories, eventDate, eventType, expectedAttendees, timelineEstimate } = preview;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Ready to convert: {eventType}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {eventDate} · {expectedAttendees} attendees · {categories.length} categories
          </p>
        </div>
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Venue</h3>
            <div className={`rounded-lg border p-3 ${venue.available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">
                    {venue.venueName || 'Not specified'}
                  </p>
                  {venue.capacity && (
                    <p className="text-xs text-gray-500">Capacity: {venue.capacity}</p>
                  )}
                  <p className={`text-sm mt-1 ${venue.available ? 'text-green-700' : 'text-red-700'}`}>
                    {venue.available ? '✓ ' : '✗ '}{venue.message}
                  </p>
                  {!venue.available && (
                    <p className="text-xs text-red-600 mt-2">
                      This venue was booked by another event. Converting will proceed
                      without a venue booking — you can assign a free venue afterwards.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Vendor assignments</h3>
            <div className="space-y-2">
              {categories.map((cat) => {
                const top = cat.candidates[0];
                const isExpanded = expandedCategory === cat.category;
                return (
                  <div key={cat.category} className="rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 uppercase text-sm">
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
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
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
                            <p className="text-xs text-red-700 mt-1">No eligible vendors for this category</p>
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
                      <div className="border-t border-gray-100 p-3 space-y-2 bg-gray-50">
                        <p className="text-xs font-medium text-gray-600 mb-2">
                          Ranked alternatives (system will pick #1):
                        </p>
                        {cat.candidates.map((c) => (
                          <div key={c.vendorId} className="flex items-center justify-between text-sm bg-white rounded p-2">
                            <div>
                              <span className="font-medium text-gray-800">#{c.rank} {c.companyName}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                score {(c.score * 100).toFixed(0)}% · rating {c.rating ?? 'N/A'}/5 · {c.currentLoad} active
                              </span>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-gray-500 italic mt-2">
                          If the top vendor declines, the system offers the next ranked candidate automatically.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-800">{timelineEstimate}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Converting…' : 'Confirm and Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}
