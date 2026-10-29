import { CheckIcon } from '@heroicons/react/24/solid';

export default function EventTimeline({ timeline }) {
  if (!timeline) return null;

  const steps = [
    { id: 'inquiry', label: 'Inquiry Submitted', active: timeline.inquirySubmitted },
    { id: 'proposal', label: 'Proposal Sent', active: timeline.proposalSent },
    { id: 'venue', label: 'Venue Held', active: timeline.venueHeld, tooltip: timeline.venueName ? `${timeline.venueName} reserved` : null },
    { id: 'vendors', label: 'Vendors Confirmed', active: timeline.vendorsConfirmed },
    { id: 'confirmed', label: 'Event Confirmed', active: timeline.eventConfirmed },
  ];

  let currentStepIndex = steps.findLastIndex(step => step.active);
  if (currentStepIndex === -1) currentStepIndex = 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <h3 className="text-lg font-semibold text-slate-800 mb-8">Event Progress</h3>

      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full hidden md:block" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0 relative z-10">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.id} className="flex md:flex-col items-center gap-4 md:gap-3 w-full md:w-auto relative">
                {index !== steps.length - 1 && (
                  <div className="absolute left-[19px] top-10 w-1 h-full bg-slate-100 md:hidden" />
                )}

                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 bg-white
                    ${isCompleted ? 'bg-indigo-600 border-indigo-600' : ''}
                    ${isCurrent ? 'border-indigo-600 ring-4 ring-indigo-100 animate-pulse' : ''}
                    ${!isCompleted && !isCurrent ? 'border-slate-300' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5 text-white" />
                  ) : (
                    <span className={`text-sm font-bold ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {index + 1}
                    </span>
                  )}
                </div>

                <div className="md:text-center mt-1">
                  <p className={`text-sm font-semibold ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                    {step.label}
                  </p>
                  {step.tooltip && step.active && (
                    <p className="text-xs text-slate-500 mt-1 bg-indigo-50 px-2 py-1 rounded-md inline-block">
                      {step.tooltip}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
