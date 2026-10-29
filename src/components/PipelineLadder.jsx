import { CheckCircleIcon, ClockIcon, XCircleIcon, ChevronDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function PipelineLadder({
  category,
  assignments = [],
  alternativeVendors = [],
  onForceAssign,
  showAlternatives = true,
}) {
  const [expanded, setExpanded] = useState(false);

  const rank = (s) => {
    if (s === 'ACCEPTED' || s === 'COMPLETED') return 3;
    if (s === 'PENDING' || s === 'OPEN') return 2;
    if (s === 'DECLINED') return 1;
    return 0;
  };

  const sorted = [...assignments].sort(
    (a, b) => rank(b.status) - rank(a.status) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  const current = sorted.find((a) => a.status === 'PENDING' || a.status === 'OPEN') || sorted[0];
  const accepted = sorted.find((a) => a.status === 'ACCEPTED' || a.status === 'COMPLETED');

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
            <ClockIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-slate-800">{category.replace(/_/g, ' ')}</span>
            <p className="text-sm text-slate-600 mt-0.5">No vendors assigned yet</p>
          </div>
        </div>
        {showAlternatives && alternativeVendors.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {expanded ? 'Hide' : 'Show'} available vendors{' '}
            <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
        {expanded && alternativeVendors.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            {alternativeVendors.slice(0, 4).map((vendor, index) => (
              <div
                key={vendor.id || index}
                className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {vendor.companyName || vendor.name}
                    </p>
                    {vendor.rating && (
                      <span className="text-xs text-slate-500">? {vendor.rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
                {onForceAssign && (
                  <button
                    onClick={() => onForceAssign(null, vendor.id, category)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    Assign <ArrowRightIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {category.replace(/_/g, ' ')}
        </h4>
        {accepted && (
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">
            Confirmed
          </span>
        )}
      </div>

      <div className="relative space-y-2.5">
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200" />

        {sorted.map((attempt, index) => {
          const isLast = index === sorted.length - 1;
          const isCurrent =
            attempt.status === 'PENDING' || attempt.status === 'OPEN';
          const isAccepted =
            attempt.status === 'ACCEPTED' || attempt.status === 'COMPLETED';
          const isDeclined = attempt.status === 'DECLINED';

          let icon = <ClockIcon className="w-5 h-5" />;
          let iconColor = 'text-amber-600';
          let statusColor = 'bg-amber-50 text-amber-800';
          if (isAccepted) {
            icon = <CheckCircleIcon className="w-5 h-5" />;
            iconColor = 'text-emerald-600';
            statusColor = 'bg-emerald-100 text-emerald-800';
          } else if (isDeclined) {
            icon = <XCircleIcon className="w-5 h-5" />;
            iconColor = 'text-rose-600';
            statusColor = 'bg-rose-100 text-rose-800';
          }

          return (
            <div
              key={attempt.id || index}
              className="relative pl-10 group"
            >
              <div
                className="absolute left-0 top-3 w-5 h-5 rounded-full border-2 border-slate-300 bg-white transition-all duration-200"
              >
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full bg-indigo-500 animate-pulse" />
                )}
                {!isCurrent && <div className="absolute inset-[2px] rounded-full bg-white" />}
              </div>

              <div
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  isCurrent
                    ? 'ring-2 ring-indigo-500 shadow-md border-indigo-500 bg-white'
                    : isAccepted
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : isDeclined
                    ? 'border-rose-200 bg-slate-50 opacity-50 line-through'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p
                        className={`text-sm font-medium ${
                          isCurrent ? 'text-indigo-900' : 'text-slate-900'
                        } ${isDeclined ? 'line-through' : ''}`}
                      >
                        {attempt.vendorName || 'Vendor Pool'}
                      </p>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${statusColor} ${
                          isDeclined ? 'line-through' : ''
                        }`}
                      >
                        {attempt.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {attempt.outcome && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {attempt.outcome}
                      </p>
                    )}
                    {attempt.createdAt && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(attempt.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {isCurrent && onForceAssign && alternativeVendors.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="w-full py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                    >
                      {expanded ? 'Hide alternatives' : 'Show alternatives'}{' '}
                      <ChevronDownIcon
                        className={`w-3 h-3 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                )}

                {expanded && isCurrent && alternativeVendors.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {alternativeVendors.slice(0, 4).map((vendor, idx) => (
                      <div
                        key={vendor.id || idx}
                        className="flex items-center justify-between bg-white p-2 rounded border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="vendor"
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {vendor.companyName || vendor.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              ★ {vendor.rating ?? 'N/A'} · {vendor.currentLoad ?? 0} active
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => onForceAssign(null, vendor.id, category)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isLast && (
                <div className="absolute left-2 top-[calc(100%+8px)] bottom-[calc(100%+4px)] w-0.5 bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

