import React from 'react';

const actorColor = {
  System: 'text-navy',
  Client: 'text-green',
  Vendor: 'text-amber',
  Coordinator: 'text-rose',
};

const Timeline = ({ entries }) => (
  <div className="flow-root">
    <ul className="-mb-8">
      {entries.map((entry, idx) => (
        <li key={entry.id || idx}>
          <div className="relative pb-8">
            {idx < entries.length - 1 && (
              <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" />
            )}
            <div className="relative flex space-x-3">
              <div>
                <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white bg-${entry.actor === 'System' ? 'navy' : entry.actor === 'Client' ? 'green' : entry.actor === 'Vendor' ? 'amber' : 'rose'}/10`}>
                  <span className="text-xs font-bold">{entry.actor[0]}</span>
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-500">
                  <span className={`font-medium ${actorColor[entry.actor] || 'text-slate-700'}`}>
                    {entry.actor}
                  </span>
                  {' '}
                  <span className="text-slate-400">·</span>
                  {' '}
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="mt-0.5 text-sm text-slate-700">
                  {entry.description}
                  {entry.fromStatus && (
                    <span className="text-xs text-slate-400 ml-1">
                      ({entry.fromStatus} → {entry.toStatus})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export default Timeline;