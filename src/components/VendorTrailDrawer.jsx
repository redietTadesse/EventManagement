import { useEffect } from 'react';

const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-200 text-gray-700',
  OPEN: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const DOT_STYLES = {
  PENDING: 'bg-yellow-400',
  ACCEPTED: 'bg-green-500',
  DECLINED: 'bg-red-400',
  EXPIRED: 'bg-gray-400',
  OPEN: 'bg-orange-400',
  COMPLETED: 'bg-blue-500',
  CANCELLED: 'bg-gray-300',
};

const STATE_STYLES = {
  RESOLVED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  EXHAUSTED: 'bg-red-100 text-red-800',
};

function timeAgo(iso) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function fullDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString();
}

export default function VendorTrailDrawer({ categoryTrail, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!categoryTrail) return null;

  const { category, state, attempts = [] } = categoryTrail;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Vendor trail</p>
            <h3 className="text-lg font-semibold text-gray-800 capitalize">{category}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATE_STYLES[state] || 'bg-gray-100 text-gray-600'}`}>
                {state}
              </span>
              <span className="text-xs text-gray-500">
                {attempts.length} attempt{attempts.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {attempts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No vendor has been offered this category yet.
            </p>
          ) : (
            <ol className="relative">
              {attempts.map((a, i) => {
                const isLast = i === attempts.length - 1;
                return (
                  <li key={a.assignmentId} className="relative pl-8 pb-6 last:pb-0">
                    {!isLast && (
                      <span className="absolute left-[5px] top-4 bottom-0 w-px bg-gray-200" />
                    )}
                    <span
                      className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ring-4 ring-white ${DOT_STYLES[a.status] || 'bg-gray-300'}`}
                    />

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          <span className="text-gray-400 mr-1">#{a.attemptNumber}</span>
                          {a.vendorName || 'Open to all vendors'}
                        </p>
                        <p className="text-xs text-gray-500" title={fullDate(a.offeredAt)}>
                          offered {timeAgo(a.offeredAt)}
                          {a.respondedAt && ` · answered ${timeAgo(a.respondedAt)}`}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[a.status] || 'bg-gray-100 text-gray-600'}`}>
                        {a.status}
                      </span>
                    </div>

                    {(a.rankingScore != null || a.reason) && (
                      <div className="flex items-center gap-3 mt-2">
                        {a.rankingScore != null && (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500"
                                style={{ width: `${Math.max(0, Math.min(1, a.rankingScore)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 tabular-nums">
                              {a.rankingScore.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {a.reason && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            {a.reason}
                          </span>
                        )}
                      </div>
                    )}

                    {a.declineReason && (
                      <p className="mt-2 text-xs text-gray-600 border-l-2 border-red-200 pl-2 italic">
                        “{a.declineReason}”
                      </p>
                    )}

                    {a.outcome && (
                      <p className="mt-2 text-xs text-gray-500">
                        → {a.outcome}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Scores and reasons are recorded when each offer is made, not recalculated now.
          </p>
        </div>
      </aside>
    </div>
  );
}