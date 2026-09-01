import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import RatingStars from './RatingStars';

const VendorRatingForm = ({ vendor, eventId }) => {
  const { dispatch } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }
    dispatch({
      type: 'RATE_VENDOR',
      payload: { eventId, vendorId: vendor.id, rating, comment },
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-3 bg-green/10 border border-green/20 rounded-lg">
        <p className="text-sm text-green-800">Thanks for rating {vendor.companyName}!</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-ice flex items-center justify-center text-navy font-bold">
          {vendor.companyName.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-slate-800">{vendor.companyName}</p>
          <p className="text-xs text-slate-500">{vendor.serviceCategory.replace('_', ' ')}</p>
        </div>
      </div>
      <div className="mt-2">
        <RatingStars rating={rating} onRate={setRating} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        rows={2}
        className="w-full mt-2 rounded-lg border-slate-300 text-sm"
      />
      <button onClick={handleSubmit} className="btn-primary w-full mt-2 text-sm">
        Submit Rating
      </button>
    </div>
  );
};

export default VendorRatingForm;