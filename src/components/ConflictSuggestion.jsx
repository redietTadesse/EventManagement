import React from 'react';
import { useApp } from '../context/AppContext';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const ConflictSuggestion = ({ assignment, eventDate, onSuggestSwap }) => {
  const { state } = useApp();
  const { vendors, assignments, inquiries } = state;

  // Find other vendors in same category that are free on that date
  const category = assignment.serviceCategory;
  const otherVendors = vendors.filter(v =>
    v.serviceCategory === category &&
    v.isActive &&
    v.id !== assignment.vendorId &&
    !assignments.some(a =>
      a.vendorId === v.id &&
      a.status === 'ACCEPTED' &&
      (() => {
        // Check if this vendor has an accepted assignment on the same date
        const vendorAssignmentDate = inquiries.find(i => i.event?.id === a.eventId)?.eventDate;
        return vendorAssignmentDate === eventDate;
      })()
    )
  );

  if (otherVendors.length === 0) {
    return (
      <div className="p-4 bg-amber/10 border border-amber/20 rounded-lg">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">No Alternative Vendors Available</p>
            <p className="text-sm text-amber-700 mt-1">
              No other {category.replace('_', ' ')} vendors are available on {eventDate}. 
              The coordinator has been notified for manual assignment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-ice/10 border border-ice/20 rounded-lg">
      <div className="flex items-start gap-3 mb-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-navy mt-0.5" />
        <div>
          <p className="font-medium text-navy">Scheduling Conflict Detected</p>
          <p className="text-sm text-slate-600 mt-1">
            You have another accepted assignment on {eventDate}. Consider these alternatives:
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {otherVendors.slice(0, 3).map(v => (
          <div key={v.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-ice flex items-center justify-center text-navy font-bold text-sm">
                {v.companyName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{v.companyName}</p>
                <p className="text-xs text-slate-500">Rating: {v.rating} • {v.serviceCategory.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={() => onSuggestSwap && onSuggestSwap(v.id)}
              className="flex items-center gap-1 btn-outline text-xs py-1 px-2"
            >
              <ArrowPathIcon className="w-3 h-3" />
              Suggest Swap
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConflictSuggestion;