import React, { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

const RatingStars = ({ rating, readonly = false, onRate }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`w-5 h-5 ${star <= (hover || rating) ? 'text-amber-500' : 'text-slate-300'} ${!readonly ? 'cursor-pointer' : ''}`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onRate && onRate(star)}
        />
      ))}
    </div>
  );
};

export default RatingStars;