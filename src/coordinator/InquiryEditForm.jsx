import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function InquiryEditForm({ inquiry, onSaved, onCancel }) {
  const { updateInquiry } = useApp();
  const [name, setName] = useState(inquiry.clientName || '');
  const [date, setDate] = useState(inquiry.eventDate || '');
  const [attendees, setAttendees] = useState(inquiry.expectedAttendees ?? '');
  const [requirements, setRequirements] = useState(inquiry.requirements || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const changes = {};
    if (name.trim() !== inquiry.clientName) changes.clientName = name.trim();
    if (date !== inquiry.eventDate) changes.eventDate = date;
    if (Number(attendees) !== inquiry.expectedAttendees) changes.expectedAttendees = Number(attendees);
    if (requirements !== (inquiry.requirements || '')) changes.requirements = requirements;
    if (!Object.keys(changes).length) { onCancel(); return; }
    setSaving(true);
    setError('');
    try { onSaved(await updateInquiry(inquiry.id, changes)); }
    catch (err) { setError(err.response?.data?.message || 'Could not update the inquiry.'); }
    finally { setSaving(false); }
  }

  return <form className="mt-4 space-y-3 border-t border-slate-200 pt-4" onSubmit={submit}>
    <label className="block text-sm font-medium">Client name
      <input className="mt-1 block w-full" required maxLength={100} value={name} onChange={event => setName(event.target.value)} />
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-medium">Event start date
        <input className="mt-1 block w-full" type="date" required max={inquiry.endDate || undefined} value={date} onChange={event => setDate(event.target.value)} />
      </label>
      <label className="block text-sm font-medium">Expected attendance
        <input className="mt-1 block w-full" type="number" required min={1} value={attendees} onChange={event => setAttendees(event.target.value)} />
      </label>
    </div>
    <label className="block text-sm font-medium">Requirements
      <textarea className="mt-1 block w-full" rows={3} maxLength={1000} value={requirements} onChange={event => setRequirements(event.target.value)} />
    </label>
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button className="btn-primary" disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save details'}</button>
      <button type="button" className="btn-outline" disabled={saving} onClick={onCancel}>Cancel</button>
    </div>
  </form>;
}
