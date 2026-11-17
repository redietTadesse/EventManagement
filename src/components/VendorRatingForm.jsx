import { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { useApp } from '../context/AppContext';
import { snakeToTitleCase } from '../utils/helpers';

export default function VendorRatingForm({ assignment, onSaved }) {
  const { rateAssignment } = useApp();
  const [rating, setRating] = useState(assignment.vendorRating || 0);
  const [comment, setComment] = useState(assignment.vendorRatingComment || '');
  const [editing, setEditing] = useState(!assignment.vendorRating);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (saving || !rating) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      onSaved(await rateAssignment(assignment.id, rating, comment.trim()));
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your review. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="font-semibold text-slate-900">{assignment.vendorName}</h3>
        <p className="mt-1 text-xs text-slate-600">{snakeToTitleCase(assignment.serviceCategory)} · Completed service</p></div>
      {!editing && <button type="button" className="text-sm font-medium text-indigo-700 hover:underline"
        onClick={() => { setSaved(false); setEditing(true); }}>Edit review</button>}
    </div>
    {!editing ? <div className="mt-3 text-sm">
      <p className="inline-flex items-center gap-1 font-semibold text-amber-800"><StarIcon className="h-4 w-4" aria-hidden="true" />{assignment.vendorRating} out of 5</p>
      {assignment.vendorRatingComment && <p className="mt-2 whitespace-pre-wrap text-slate-700">{assignment.vendorRatingComment}</p>}
    </div> : <form className="mt-4 space-y-3" onSubmit={submit}>
      <fieldset disabled={saving}>
        <legend className="text-sm font-medium text-slate-700">Rating out of 5</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(value => <label key={value} className="cursor-pointer">
            <input className="peer sr-only" name={`rating-${assignment.id}`} type="radio" required
              value={value} checked={rating === value} onChange={() => setRating(value)} />
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-600">
              <StarIcon className="h-4 w-4 text-amber-500" aria-hidden="true" />{value}<span className="sr-only"> out of 5</span>
            </span>
          </label>)}
        </div>
      </fieldset>
      <label className="block text-sm font-medium">Comment <span className="font-normal text-slate-500">(optional)</span>
        <textarea value={comment} onChange={event => setComment(event.target.value)} disabled={saving}
          rows={2} className="mt-1 block w-full rounded-lg border border-slate-300" />
      </label>
      {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={saving || !rating}>{saving ? 'Saving…' : 'Save review'}</button>
        {assignment.vendorRating && <button type="button" className="btn-outline" disabled={saving}
          onClick={() => { setRating(assignment.vendorRating); setComment(assignment.vendorRatingComment || ''); setError(''); setEditing(false); }}>Cancel</button>}
      </div>
    </form>}
    {saved && <p role="status" className="mt-2 text-sm text-emerald-800">Review saved.</p>}
  </article>;
}
