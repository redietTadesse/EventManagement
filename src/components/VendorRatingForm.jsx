import { useState } from 'react';
import api from '../api/axios';

export default function VendorRatingForm({ assignment, onSaved }) {
  const alreadyRated = assignment.vendorRating != null;
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    setRating(Math.round(assignment.vendorRating) || 0);
    setComment(assignment.vendorRatingComment || '');
    setEditing(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1) { setError('Please select a star rating first'); return; }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/assignments/${assignment.id}/rate`, {
        rating: Number(rating),
        comment: comment.trim() || null,
      });
      if (onSaved) onSaved(data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyRated && !editing) {
    const rounded = Math.round(assignment.vendorRating);
    const isLow = Number(assignment.vendorRating) <= 2;
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start justify-between">
          <h4 className="font-bold text-gray-800 mb-1">{assignment.vendorName}</h4>
          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-medium text-indigo-700 hover:underline"
          >
            Edit rating
          </button>
        </div>
        <div className="text-sm text-gray-700">
          <span className="text-yellow-400 text-lg">
            {'★'.repeat(rounded)}
            <span className="text-gray-300">{'★'.repeat(5 - rounded)}</span>
          </span>
          <span className="ml-2 font-medium">{assignment.vendorRating.toFixed(1)}</span>
        </div>
        {assignment.vendorRatingComment && (
          <p className="mt-1 text-xs italic text-gray-600">"{assignment.vendorRatingComment}"</p>
        )}
        <p className="mt-1 text-xs text-emerald-700">✓ Rated — you can change this any time</p>
        {isLow && (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            Low ratings are reviewed by your coordinator. If your comment mentions a
            no-show, they will verify before any action is taken.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-bold text-gray-800">
          {assignment.vendorName}
          {editing && <span className="ml-2 text-xs font-normal text-indigo-600">(editing)</span>}
        </h4>
        {editing && (
          <button
            type="button"
            onClick={() => { setEditing(false); setError(''); }}
            className="text-xs font-medium text-slate-500 hover:underline"
          >
            Cancel
          </button>
        )}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-full sm:w-1/3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                className={`transition-colors ${
                  rating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                }`}
              >
                ★
              </button>
            ))}
          </div>
          {rating > 0 && <p className="mt-1 text-xs text-gray-500">{rating} of 5</p>}
        </div>
        <div className="w-full sm:w-2/3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Comments (optional)
          </label>
          <input
            type="text"
            placeholder="How was their service?"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting || rating < 1}
        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Saving…' : editing ? 'Update Rating' : 'Submit Rating'}
      </button>
    </form>
  );
}