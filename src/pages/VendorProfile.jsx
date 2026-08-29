import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import PageHeader from '../components/PageHeader';
import RatingStars from '../components/RatingStars';
import StatusBadge from '../components/StatusBadge';
import { PhoneIcon, EnvelopeIcon, CalendarIcon, StarIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const VendorProfile = () => {
  const { id } = useParams();
  const { state } = useApp();
  const { vendors, assignments, inquiries } = state;
  const navigate = useNavigate();
  const vendor = vendors.find(v => v.id === parseInt(id));

  if (!vendor) {
    return (
      <div>
        <PageHeader title="Not Found" />
        <p className="text-slate-500">Vendor not found.</p>
      </div>
    );
  }

  const avgRating = vendor.ratings?.length
    ? (vendor.ratings.reduce((sum, r) => sum + r.rating, 0) / vendor.ratings.length).toFixed(1)
    : vendor.rating?.toFixed(1) || '—';

  const vendorAssignments = assignments.filter(a => a.vendorId === vendor.id);
  const pastEvents = vendorAssignments
    .filter(a => a.status === 'ACCEPTED')
    .map(a => {
      const inquiry = inquiries.find(i => i.event?.id === a.eventId);
      return { ...a, date: inquiry?.eventDate, status: inquiry?.event?.status || a.status };
    });

  return (
    <div className="page-enter max-w-4xl mx-auto">
      <PageHeader
        title="Vendor Profile"
        subtitle={`Service provider #${vendor.id}`}
        action={
          <button onClick={() => navigate(-1)} className="btn-outline text-sm">
            <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back
          </button>
        }
      />

      {/* Header card */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-ice flex items-center justify-center text-navy font-bold text-3xl flex-shrink-0">
            {vendor.companyName.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">{vendor.companyName}</h2>
            <p className="text-sm text-slate-500 capitalize mt-0.5">
              {vendor.serviceCategory.replace('_', ' ')} services
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <RatingStars rating={avgRating === '—' ? 0 : parseFloat(avgRating)} readonly />
                <span className="text-sm font-semibold text-slate-700">{avgRating}</span>
              </div>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-sm text-slate-500">{vendor.ratings?.length || 0} reviews</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-sm text-slate-500">{pastEvents.length} past events</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <span className={`badge ${vendor.isActive ? 'badge-green' : 'badge-gray'}`}>
              {vendor.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={() => alert(`Mock contact: email ${vendor.companyName.replace(/\s/g, '').toLowerCase()}@aicc.et`)}
              className="btn-primary text-sm"
            >
              <EnvelopeIcon className="w-4 h-4 mr-1" /> Contact Vendor
            </button>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <PhoneIcon className="w-4 h-4 text-navy" />
            Phone: <span className="font-medium text-slate-800">{vendor.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <EnvelopeIcon className="w-4 h-4 text-navy" />
            Email: <span className="font-medium text-slate-800">{vendor.companyName.replace(/\s/g, '').toLowerCase()}@aicc.et</span>
          </div>
        </div>
      </div>

      {/* Past events */}
      <div className="card mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">Past Events ({pastEvents.length})</h3>
        {pastEvents.length === 0 ? (
          <p className="text-sm text-slate-500">No past events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Event</th>
                  <th className="px-3 py-2 text-left font-semibold">Date</th>
                  <th className="px-3 py-2 text-left font-semibold">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastEvents.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{a.eventName}</td>
                    <td className="px-3 py-2 text-slate-600 flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" /> {a.date || '—'}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">Client Reviews</h3>
        {(!vendor.ratings || vendor.ratings.length === 0) ? (
          <p className="text-sm text-slate-500">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {vendor.ratings.map((r, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <StarIcon className="w-4 h-4 text-amber" />
                  <RatingStars rating={r.rating} readonly />
                  <span className="text-xs text-slate-400">
                    {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : 'Previous event'}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-slate-700 mt-1">"{r.comment}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link to="/coordinator/vendors" className="text-sm text-navy hover:text-navy/80 font-medium">
          ← Back to all vendors
        </Link>
      </div>
    </div>
  );
};

export default VendorProfile;