import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function VendorSuggestions({
  category,
  eventDate,
  eventId,
  excludeVendorId,
  selectedVendorIds = [],
  onSelectVendor,
  actionLabel = 'Select for shortlist',
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [excludedCandidates, setExcludedCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!category || !eventDate) {
      setSuggestions([]);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { date: eventDate };
        if (excludeVendorId) params.excludeVendorId = excludeVendorId;
        if (eventId) {
          const response = await api.get(
            `/vendor-suggestions/event/${eventId}/category/${encodeURIComponent(category)}/decision-preview`,
          );
          if (!cancelled) {
            setSuggestions(response.data?.eligible || []);
            setExcludedCandidates(response.data?.excluded || []);
          }
        } else {
          const response = await api.get(
            `/vendor-suggestions/category/${encodeURIComponent(category)}`,
            { params },
          );
          if (!cancelled) {
            setSuggestions(response.data || []);
            setExcludedCandidates([]);
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load vendor suggestions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [category, eventDate, eventId, excludeVendorId]);

  if (!category || !eventDate) {
    return <p className="py-5 text-sm text-slate-500">Select a category and event date to see suggestions.</p>;
  }
  if (loading) return <p className="py-5 text-sm text-slate-500">Loading vendor suggestions…</p>;
  if (error) return <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>;
  if (suggestions.length === 0 && excludedCandidates.length === 0) {
    return <p className="py-5 text-sm text-slate-500">No vendors are available for this category and date.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Recommended vendors</h4>
        <span className="text-xs text-slate-500">{suggestions.length} eligible now</span>
      </div>
      {eventId && <p className="text-xs text-slate-500">Eligible vendors passed the event’s category, account, insurance, prior-attempt, and availability checks. Match score weights quality 50%, workload 40%, and rotation 10%.</p>}
      {suggestions.map((suggestion, index) => {
        const vendorId = suggestion.vendorId;
        const selected = selectedVendorIds.some(id => String(id) === String(vendorId));
        const score = Math.max(0, Math.min(100, Number(suggestion.score) || 0));
        const vendor = {
          id: vendorId,
          companyName: suggestion.companyName,
          serviceCategory: suggestion.serviceCategory || category,
          rating: suggestion.rating,
          phone: suggestion.phone,
          email: suggestion.email,
          notes: suggestion.notes,
          score,
          reasoning: suggestion.reasoning,
          activeAssignments: suggestion.activeAssignments,
        };

        return (
          <article key={vendorId} className={`rounded-xl border p-4 ${selected ? 'border-indigo-500 bg-indigo-50/50' : index === 0 ? 'border-emerald-300 bg-white' : 'border-slate-200 bg-white'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h5 className="font-semibold text-slate-800">{suggestion.companyName || 'Unknown vendor'}</h5>
                  {index === 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Top match</span>}
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${score}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{Math.round(score)}%</span>
                </div>
                {suggestion.reasoning && <p className="text-xs text-slate-600">{suggestion.reasoning}</p>}
                {suggestion.eligibilityExplanation && <p className="mt-1 text-xs text-emerald-700">{suggestion.eligibilityExplanation}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Quality: {Math.round(suggestion.qualityScore || 0)}%</span>
                  <span>Workload: {Math.round(suggestion.workloadScore || 0)}%</span>
                  <span>Rotation: {Math.round(suggestion.rotationScore || 0)}%</span>
                  {suggestion.activeAssignments != null && <span>Active assignments: {suggestion.activeAssignments}</span>}
                  {suggestion.phone && <span>{suggestion.phone}</span>}
                </div>
              </div>
              {onSelectVendor && (
                <button
                  type="button"
                  onClick={() => onSelectVendor(vendor)}
                  aria-pressed={selected}
                  className={`rounded-lg px-3 py-2 text-xs font-medium text-white ${selected ? 'bg-slate-600 hover:bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {selected ? 'Remove from shortlist' : actionLabel}
                </button>
              )}
            </div>
          </article>
        );
      })}
      {excludedCandidates.length > 0 && (
        <details className="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-rose-800">
            {excludedCandidates.length} vendor{excludedCandidates.length === 1 ? '' : 's'} excluded by eligibility checks
          </summary>
          <ul className="mt-2 space-y-2">
            {excludedCandidates.map(candidate => (
              <li key={candidate.vendorId} className="text-xs text-rose-800">
                <span className="font-medium">{candidate.companyName || 'Vendor'}</span>
                <span> — {candidate.reason || 'Not eligible for this event.'}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
