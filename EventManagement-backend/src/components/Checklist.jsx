import React from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const Checklist = ({ items }) => (
  <ul className="space-y-2">
    {items.map(item => (
      <li key={item.id} className="flex items-start gap-2">
        {item.isComplete ? (
          <CheckCircleIcon className="w-5 h-5 text-green mt-0.5" />
        ) : (
          <XCircleIcon className="w-5 h-5 text-slate-300 mt-0.5" />
        )}
        <span className={`text-sm ${item.isComplete ? 'line-through text-slate-400' : 'text-slate-700'}`}>
          {item.itemName}
        </span>
      </li>
    ))}
  </ul>
);

export default Checklist;