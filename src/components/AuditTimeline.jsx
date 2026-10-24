import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';

const actorConfig = {
  System: {
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    initial: 'S',
  },
  Client: {
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    initial: 'C',
  },
  Vendor: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    initial: 'V',
  },
  Coordinator: {
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
    initial: 'C',
  },
  Admin: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    initial: 'A',
  },
};

export default function AuditTimeline({ referenceType, referenceId, expandedByDefault = true }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(expandedByDefault);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = referenceType === 'EVENT'
          ? `/history/event/${referenceId}`
          : `/history/inquiry/${referenceId}`;
        const res = await api.get(endpoint);
        setEntries(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    if (referenceType && referenceId) {
      fetchHistory();
    }
  }, [referenceType, referenceId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-sm text-gray-500">No history available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h3 className="font-medium text-gray-800">Audit Trail</h3>
        {expanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="p-6">
          <div className="flow-root">
            <ul className="-mb-8">
              {entries.map((entry, idx) => {
                const actor = entry.actor || 'System';
                const config = actorConfig[actor] || actorConfig.System;

                return (
                  <li key={entry.id || idx}>
                    <div className="relative pb-8">
                      {idx < entries.length - 1 && (
                        <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${config.bgColor} ${config.color}`}>
                            <span className="text-xs font-bold">{config.initial}</span>
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-500">
                            <span className={`font-medium ${config.color}`}>
                              {actor}
                            </span>
                            {' '}
                            <span className="text-gray-400">·</span>
                            {' '}
                            {formatTimestamp(entry.occurredAt)}
                          </div>
                          <div className="mt-0.5 text-sm text-gray-700">
                            {entry.description || `${entry.fromStatus || ''} → ${entry.toStatus || ''}`}
                          </div>
                          {entry.metadata && (
                            <div className="mt-1 text-xs text-gray-500">
                              {Object.entries(entry.metadata).map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
