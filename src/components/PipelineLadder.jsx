import { CheckCircleIcon, ClockIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

function ExcludedVendorList({ excludedVendors = [] }) {
  if (excludedVendors.length === 0) return null;
  return (
    <details open className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-rose-800">
        {excludedVendors.length} vendor{excludedVendors.length === 1 ? '' : 's'} excluded by eligibility checks
      </summary>
      <ul className="mt-2 space-y-2">
        {excludedVendors.map((vendor, index) => (
          <li key={vendor.vendorId || index} className="text-xs text-rose-800">
            <span className="font-medium">{vendor.companyName || vendor.vendorName || 'Vendor'}</span>
            <span> — {vendor.reason || 'Not eligible for this event.'}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function AssignmentDecisionPanel({
  category,
  alternativeVendors,
  excludedVendors,
  decisionLoading,
  decisionError,
  expanded,
  setExpanded,
  canAssign,
  assignmentId,
  onForceAssign,
}) {
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-slate-900">Assignment decision</span>
          <span className="block text-xs text-slate-600">
            {decisionLoading ? 'Refreshing eligibility' : `${alternativeVendors.length} eligible alternative${alternativeVendors.length === 1 ? '' : 's'}`}
          </span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-indigo-700 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-indigo-100 pt-3">
          <p className="text-xs text-slate-600">Ranked by quality (50%), load (40%), and rotation (10%).</p>
          {decisionLoading && <p role="status" className="text-xs text-slate-500">Checking event-specific vendor eligibility…</p>}
          {decisionError && <p role="alert" className="text-xs text-rose-700">{decisionError}</p>}
          {!decisionLoading && !decisionError && alternativeVendors.length === 0 && (
            <p className="text-xs text-slate-600">No eligible alternative is available for this category and event date.</p>
          )}
          {alternativeVendors.slice(0, 4).map((vendor, index) => (
            <div key={vendor.id || vendor.vendorId || index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{vendor.companyName || vendor.name || 'Vendor'}</p>
                  {vendor.score != null && (
                    <p className="mt-0.5 text-xs text-slate-600">
                      Match {Math.round(vendor.score)}% · quality {Math.round(vendor.qualityScore || 0)}% · load {Math.round(vendor.workloadScore || 0)}% · rotation {Math.round(vendor.rotationScore || 0)}%
                    </p>
                  )}
                  {vendor.eligibilityExplanation && <p className="mt-1 text-xs text-emerald-700">{vendor.eligibilityExplanation}</p>}
                  {vendor.reasoning && <p className="mt-1 text-xs text-slate-600">{vendor.reasoning}</p>}
                </div>
              </div>
              {canAssign && onForceAssign && (
                <button
                  type="button"
                  onClick={() => onForceAssign(assignmentId, vendor.id || vendor.vendorId, category)}
                  className="shrink-0 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  Assign
                </button>
              )}
            </div>
          ))}
          <ExcludedVendorList excludedVendors={excludedVendors} />
        </div>
      )}
    </section>
  );
}

export default function PipelineLadder({
  category,
  assignments = [],
  alternativeVendors = [],
  excludedVendors = [],
  decisionLoading = false,
  decisionError = '',
  onForceAssign,
  showAlternatives = true,
}) {
  const [expanded, setExpanded] = useState(true);

  const sorted = [...assignments].sort(
    (a, b) => Number(a.id || 0) - Number(b.id || 0) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  );

  const current = [...sorted].reverse().find((a) => a.status === 'PENDING' || a.status === 'OPEN') || sorted.at(-1);
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
        {showAlternatives && (
          <AssignmentDecisionPanel
            category={category}
            alternativeVendors={alternativeVendors}
            excludedVendors={excludedVendors}
            decisionLoading={decisionLoading}
            decisionError={decisionError}
            expanded={expanded}
            setExpanded={setExpanded}
            canAssign
            onForceAssign={onForceAssign}
          />
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
          const isCurrent = current?.id === attempt.id;
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
                    ? 'border-rose-200 bg-rose-50/60'
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
                        }`}
                      >
                        {attempt.vendorName || 'Vendor Pool'}
                      </p>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${statusColor}`}
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

              </div>

              {!isLast && (
                <div className="absolute left-2 top-[calc(100%+8px)] bottom-[calc(100%+4px)] w-0.5 bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>
      {showAlternatives && (
        <AssignmentDecisionPanel
          category={category}
          alternativeVendors={alternativeVendors}
          excludedVendors={excludedVendors}
          decisionLoading={decisionLoading}
          decisionError={decisionError}
          expanded={expanded}
          setExpanded={setExpanded}
          canAssign={!accepted && current?.status !== 'PENDING'}
          assignmentId={current?.status === 'OPEN' ? current.id : null}
          onForceAssign={onForceAssign}
        />
      )}
    </div>
  );
}
