import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import api from '../api/axios';
import { formatEventDate } from '../coordinator/eventDetailModel';
import { calendarDateKey } from '../hooks/useVenueAvailabilityCalendar';

function DateResult({ result, selected, onSelect, disabled }) {
  const { date, impact, error } = result;
  const conflicts = impact?.vendorConflicts || [];
  const reconfirmations = impact?.needsReconfirmation || [];
  const blocked = !impact?.venueAvailable || conflicts.length > 0;

  return <article className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-4">
    <p className="eyebrow">Proposed start date</p>
    <h3 className="mt-1 text-lg font-semibold">{formatEventDate(date)}</h3>
    {error ? <p className="mt-2 text-sm text-rose-800">{error}</p> : <>
      <p className={'mt-2 text-sm font-semibold ' + (blocked ? 'text-rose-800' : 'text-emerald-800')}>
        {blocked ? 'Scheduling conflict' : 'No scheduling conflicts found'}
      </p>
      <p className="mt-2 text-sm text-slate-700">Venue: {impact.venueAvailable ? 'No conflict found' : 'Unavailable'}</p>
      <p className="mt-1 text-sm text-slate-700">Vendor reconfirmations: {reconfirmations.length}</p>
      {[...conflicts, ...reconfirmations].length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
        {[...conflicts, ...reconfirmations].map((message, index) => <li key={index}>{message}</li>)}
      </ul>}
      <div className="mt-auto pt-4">
        <button type="button" className="btn-outline aria-pressed:border-indigo-600 aria-pressed:bg-indigo-50 disabled:opacity-50"
          aria-label={'Choose ' + formatEventDate(date)} aria-pressed={selected} disabled={blocked || disabled} onClick={onSelect}>
          {selected ? 'Selected' : 'Choose this date'}
        </button>
      </div>
    </>}
  </article>;
}

export default function ChangeDateModal({ onClose, eventId, currentDate, onDateChanged }) {
  const [dates, setDates] = useState(['', '']);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = calendarDateKey(new Date());
  const candidates = dates.filter(Boolean);
  const valid = dates[0] && candidates.every(date => date >= today && date !== currentDate)
    && new Set(candidates).size === candidates.length;

  async function compare(event) {
    event.preventDefault();
    if (!valid || loading || saving) return;
    setLoading(true);
    setSelected('');
    setResults([]);
    setError('');
    const checks = await Promise.allSettled(candidates.map(date =>
      api.get('/events/' + eventId + '/impact', { params: { newDate: date } })));
    setResults(checks.map((check, index) => check.status === 'fulfilled'
      ? { date: candidates[index], impact: check.value.data }
      : { date: candidates[index], error: 'Could not check this date. Compare again to retry.' }));
    setLoading(false);
  }

  async function confirmChange() {
    if (!selected || loading || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await api.put('/events/' + eventId + '/date', null, { params: { newDate: selected } });
      await onDateChanged?.(selected, response.data);
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update the event date.');
      setSaving(false);
    }
  }

  return <Dialog open onClose={saving ? () => {} : onClose} className="relative z-50">
    <div className="fixed inset-0 bg-slate-900/60" aria-hidden="true" />
    <div className="fixed inset-0 overflow-y-auto p-4">
      <div className="flex min-h-full items-center justify-center">
        <Dialog.Panel className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="bg-[#142f32] p-5 text-white sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#efd392]">Event operations</p>
            <Dialog.Title className="mt-2 text-2xl font-semibold">Compare rescheduling options</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-emerald-50">
              Current start date: {formatEventDate(currentDate)}. Check the venue and vendors for up to two alternatives before choosing a new date.
            </Dialog.Description>
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <form onSubmit={compare} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              {dates.map((date, index) => <label key={index} className="grid gap-1 text-sm font-medium">
                {index === 0 ? 'First alternative' : 'Second alternative (optional)'}
                <input type="date" min={today} required={index === 0} value={date} disabled={loading || saving}
                  className="w-full min-w-0" onChange={event => {
                    setDates(dates.map((value, position) => position === index ? event.target.value : value));
                    setResults([]);
                    setSelected('');
                    setError('');
                  }} />
              </label>)}
              <button type="submit" className="btn-primary disabled:opacity-50" disabled={!valid || loading || saving}>Check dates</button>
            </form>
            {candidates.length > 0 && !valid && <p className="text-sm text-slate-600">Choose distinct alternatives on or after today, different from the current date.</p>}
            {loading && <p role="status" className="text-sm">Checking venue and vendor availability…</p>}
            {results.length > 0 && <div className="grid gap-3 sm:grid-cols-2" aria-label="Date comparison">
              {results.map(result => <DateResult key={result.date} result={result} selected={result.date === selected}
                disabled={saving} onSelect={() => setSelected(result.date)} />)}
            </div>}
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-outline" disabled={saving} onClick={onClose}>Close</button>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={!selected || saving} onClick={confirmChange}>
                {saving ? 'Rescheduling…' : selected ? 'Move to ' + formatEventDate(selected) : 'Confirm new date'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </div>
  </Dialog>;
}
