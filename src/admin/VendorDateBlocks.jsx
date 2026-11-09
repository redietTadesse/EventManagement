import { useState } from 'react';
import api from '../api/axios';
import useApiResource from '../hooks/useApiResource';

export default function VendorDateBlocks({ vendorId }) {
  const path = `/vendors/${vendorId}/booked-dates`;
  const dates = useApiResource(path);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function changeDate(action, selectedDate) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (action === 'add') {
        await api.post(path, null, { params: { date: selectedDate } });
        setDate('');
      } else {
        await api.delete(path, { params: { date: selectedDate } });
      }
      setMessage(action === 'add' ? `Blocked ${selectedDate}.` : `Removed the block for ${selectedDate}.`);
      dates.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update vendor availability.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="vendor-date-blocks">
    <h2 id="vendor-date-blocks" className="font-semibold text-slate-900">Vendor date blocks</h2>
    <p className="mt-1 text-sm text-slate-600">Block dates when this vendor is unavailable for new assignments.</p>
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={event => {
      event.preventDefault();
      if (date && !saving) changeDate('add', date);
    }}>
      <label className="text-sm font-medium">Date to block
        <input className="mt-1 block rounded-lg border border-slate-300 p-2" type="date" required value={date} onChange={event => setDate(event.target.value)} />
      </label>
      <button className="btn-primary" disabled={saving || dates.loading || !date}>Block date</button>
    </form>
    {message && <p role="status" className="mt-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
    {dates.loading ? <p role="status" className="mt-4 text-sm text-slate-600">Loading blocked dates…</p>
      : dates.error ? <p role="alert" className="mt-4 text-sm text-rose-800">{dates.error}{' '}
        <button type="button" onClick={dates.reload} className="underline">Retry</button></p>
      : dates.data.length === 0 ? <p className="mt-4 text-sm text-slate-600">No manual date blocks.</p>
      : <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
        {dates.data.map(value => <li key={value} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <time dateTime={value}>{value}</time>
          <button type="button" disabled={saving} onClick={() => changeDate('remove', value)}
            aria-label={`Remove block for ${value}`} className="font-medium text-rose-700 hover:underline disabled:opacity-50">Remove</button>
        </li>)}
      </ul>}
  </section>;
}
