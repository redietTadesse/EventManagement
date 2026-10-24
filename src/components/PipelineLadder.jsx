import { CheckCircleIcon, ClockIcon, XCircleIcon, ArrowRightIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function PipelineLadder({
  category,
  assignments = [],
  alternativeVendors = [],
  onForceAssign,
  showAlternatives = true,
}) {
  const [expanded, setExpanded] = useState(false);

  // Find the current live assignment (not declined, not cancelled)
  const currentAssignment = assignments.find(a => a.status === 'PENDING' || a.status === 'ACCEPTED') ||
                            assignments.find(a => a.status === 'OPEN');

  // Find accepted assignment
  const acceptedAssignment = assignments.find(a => a.status === 'ACCEPTED' || a.status === 'COMPLETED');

  // Find declined assignments
  const declinedAssignments = assignments.filter(a => a.status === 'DECLINED');

  // If accepted, show simple success state
  if (acceptedAssignment) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-800">{category}</span>
              <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                Confirmed
              </span>
            </div>
            <p className="text-sm text-emerald-700">
              {acceptedAssignment.vendorName || 'Vendor assigned'}
              {acceptedAssignment.respondedAt && (
                <span className="text-emerald-600 ml-2">
                  · {getTimeAgo(acceptedAssignment.respondedAt)}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If there's a current assignment (pending or open)
  if (currentAssignment) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-800">{category}</span>
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                {currentAssignment.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-amber-700">
              {currentAssignment.vendorName || 'Awaiting vendor'}
              {currentAssignment.createdAt && (
                <span className="text-amber-600 ml-2">
                  · {getTimeAgo(currentAssignment.createdAt)}
                </span>
              )}
            </p>
          </div>
          {showAlternatives && alternativeVendors.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1"
            >
              {expanded ? 'Hide' : 'Show'} alternatives
              <ChevronRightIcon className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>

        {expanded && alternativeVendors.length > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            <p className="text-xs text-amber-600 mb-2">Alternative vendors:</p>
            <div className="space-y-2">
              {alternativeVendors.slice(0, 3).map((vendor, index) => (
                <div
                  key={vendor.id || index}
                  className="flex items-center justify-between bg-white rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600 font-medium">#{index + 2}</span>
                    <span className="text-sm text-gray-700">{vendor.companyName || vendor.name}</span>
                    {vendor.rating && (
                      <span className="text-xs text-gray-500">★ {vendor.rating.toFixed(1)}</span>
                    )}
                  </div>
                  {onForceAssign && (
                    <button
                      onClick={() => onForceAssign(currentAssignment.id, vendor.id, category)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                    >
                      <ArrowRightIcon className="w-3 h-3" />
                      Force assign
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // If there are declined assignments, show escalation history
  if (declinedAssignments.length > 0) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <XCircleIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-rose-800">{category}</span>
              <span className="text-xs text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                {declinedAssignments.length} declined
              </span>
            </div>
            <p className="text-sm text-rose-700">
              Vendors declined. Next options available below.
            </p>
          </div>
        </div>

        {/* Show declined history */}
        <div className="space-y-2 mb-3">
          {declinedAssignments.slice(0, 2).map((assignment, index) => (
            <div
              key={assignment.id}
              className="flex items-center gap-2 bg-white rounded px-3 py-2 opacity-60"
            >
              <XCircleIcon className="w-4 h-4 text-rose-500" />
              <span className="text-sm text-gray-600 line-through">
                {assignment.vendorName || 'Vendor'}
              </span>
              {assignment.declineReason && (
                <span className="text-xs text-gray-500">({assignment.declineReason})</span>
              )}
            </div>
          ))}
        </div>

        {/* Show alternatives */}
        {showAlternatives && alternativeVendors.length > 0 && (
          <div className="pt-3 border-t border-rose-200">
            <p className="text-xs text-rose-600 mb-2">Next ranked vendors:</p>
            <div className="space-y-2">
              {alternativeVendors.slice(0, 3).map((vendor, index) => (
                <div
                  key={vendor.id || index}
                  className="flex items-center justify-between bg-white rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-600 font-medium">#{index + 1}</span>
                    <span className="text-sm text-gray-700">{vendor.companyName || vendor.name}</span>
                    {vendor.rating && (
                      <span className="text-xs text-gray-500">★ {vendor.rating.toFixed(1)}</span>
                    )}
                  </div>
                  {onForceAssign && (
                    <button
                      onClick={() => onForceAssign(null, vendor.id, category)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                    >
                      <ArrowRightIcon className="w-3 h-3" />
                      Force assign
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // No assignments yet
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
          <ClockIcon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <span className="font-semibold text-slate-800">{category}</span>
          <p className="text-sm text-slate-600">No vendors assigned yet</p>
        </div>
        {showAlternatives && alternativeVendors.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-600 hover:text-slate-700 text-sm font-medium flex items-center gap-1"
          >
            {expanded ? 'Hide' : 'Show'} options
            <ChevronRightIcon className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {expanded && alternativeVendors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-600 mb-2">Available vendors:</p>
          <div className="space-y-2">
            {alternativeVendors.slice(0, 3).map((vendor, index) => (
              <div
                key={vendor.id || index}
                className="flex items-center justify-between bg-white rounded px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">#{index + 1}</span>
                  <span className="text-sm text-gray-700">{vendor.companyName || vendor.name}</span>
                  {vendor.rating && (
                    <span className="text-xs text-gray-500">★ {vendor.rating.toFixed(1)}</span>
                  )}
                </div>
                {onForceAssign && (
                  <button
                    onClick={() => onForceAssign(null, vendor.id, category)}
                    className="text-xs text-slate-600 hover:text-slate-700 font-medium flex items-center gap-1"
                  >
                    <ArrowRightIcon className="w-3 h-3" />
                    Assign
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
