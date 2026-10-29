import { useState, useEffect } from 'react';
import api from '../api/axios';

/**
 * VendorSuggestions - Display smart vendor recommendations
 * Based on backend vendor suggestion service
 */
export default function VendorSuggestions({ category, eventDate, excludeVendorId, onSelectVendor }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category && eventDate) {
      fetchSuggestions();
    }
  }, [category, eventDate, excludeVendorId]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        date: eventDate,
      };
      if (excludeVendorId) {
        params.excludeVendorId = excludeVendorId;
      }
      const res = await api.get(`/vendor-suggestions/category/${category}`, { params });
      setSuggestions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch vendor suggestions:', err);
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  if (!category || !eventDate) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        Select a category and date to see vendor suggestions
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
        <p className="text-sm text-slate-500 mt-2">Loading suggestions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 text-rose-700 p-4 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        No vendors available for this category and date
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">
          Top Vendor Recommendations
        </h4>
        <span className="text-xs text-slate-500">
          {suggestions.length} available
        </span>
      </div>

      {suggestions.map((suggestion, index) => (
        <div
          key={suggestion.vendor?.id || index}
          className={`bg-white rounded-xl border-2 p-4 transition-all hover:shadow-md cursor-pointer ${
            index === 0
              ? 'border-emerald-500 shadow-sm'
              : 'border-slate-200 hover:border-indigo-300'
          }`}
          onClick={() => onSelectVendor && onSelectVendor(suggestion.vendor)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {index === 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    Best Match
                  </span>
                )}
                <h5 className="font-semibold text-slate-800">
                  {suggestion.vendor?.companyName || 'Unknown'}
                </h5>
              </div>

              {/* Suitability Score */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${suggestion.score || 0}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {Math.round(suggestion.score || 0)}%
                </span>
              </div>

              {/* Reasoning */}
              {suggestion.reasoning && (
                <p className="text-xs text-slate-600 line-clamp-2">
                  {suggestion.reasoning}
                </p>
              )}

              {/* Vendor Details */}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                {suggestion.vendor?.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400">★</span>
                    <span>{suggestion.vendor.rating}</span>
                  </div>
                )}
                {suggestion.vendor?.phone && (
                  <span>📞 {suggestion.vendor.phone}</span>
                )}
              </div>
            </div>

            {onSelectVendor && (
              <button className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                Select
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
