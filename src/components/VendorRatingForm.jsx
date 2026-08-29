import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import RatingStars from './RatingStars';

const VendorRatingForm = ({ vendor, eventId, className = '' }) => {
  const { dispatch } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    dispatch({
      type: 'RATE_VENDOR',
      payload: { eventId, vendorId: vendor.id, rating, comment },
    });
    setSubmitted(true);
  };

  return (
    <div className={`p-3 border border-slate-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-ice flex items-center justify-center text-navy font-bold text-sm flex-shrink-0">
            {vendor.companyName.charAt(0)}
          </div>
          <span className="text-sm font-medium text-slate-800 truncate">{vendor.companyName}</span>
        </div>
        {submitted ? (
          <span className="text-xs font-medium text-green">✓ Thank you for rating!</span>
        ) : (
          <RatingStars rating={rating} onRate={setRating} />
        )}
      </div>
      {!submitted ? (
        <>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Short feedback for this vendor (optional)"
            className="mt-2 w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy text-sm"
          />
          <div className="mt-2 flex justify-end">
            <button onClick={handleSubmit} disabled={rating === 0} className="btn-primary text-xs py-1 px-3">
              Submit Rating
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500 mt-1">
          {rating}/5 — {comment || 'No comment'}
        </p>
      )}
    </div>
  );
};

export default VendorRatingForm;