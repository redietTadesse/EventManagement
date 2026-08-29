import React from 'react';
import { Link } from 'react-router-dom';
import RatingStars from './RatingStars';
import { PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const VendorProfileCard = ({ vendor, assignments }) => {
  const avgRating = vendor.ratings?.length
    ? (vendor.ratings.reduce((sum, r) => sum + r.rating, 0) / vendor.ratings.length).toFixed(1)
    : vendor.rating?.toFixed(1) || '—';

  const pastEventsCount = assignments?.filter(a => a.vendorId === vendor.id && a.status === 'ACCEPTED').length || 0;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-ice flex items-center justify-center text-navy font-bold text-xl flex-shrink-0">
          {vendor.companyName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800 truncate">{vendor.companyName}</h4>
          <p className="text-sm text-slate-500 capitalize">{vendor.serviceCategory.replace('_', ' ')}</p>
          <div className="flex items-center gap-2 mt-1">
            <RatingStars rating={avgRating === '—' ? 0 : parseFloat(avgRating)} readonly />
            <span className="text-sm text-slate-600">{avgRating}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>{vendor.ratings?.length || 0} reviews</span>
            <span>•</span>
            <span>{pastEventsCount} past events</span>
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <PhoneIcon className="w-4 h-4" />
          <span className="truncate">{vendor.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <EnvelopeIcon className="w-4 h-4" />
          <span className="truncate">Contact</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs font-medium ${vendor.isActive ? 'text-green' : 'text-rose'}`}>
          {vendor.isActive ? '● Active' : '● Inactive'}
        </span>
        <Link to={`/vendor/${vendor.id}`} className="btn-outline text-xs py-1 px-3">
          View Profile
        </Link>
      </div>
    </div>
  );
};

export default VendorProfileCard;