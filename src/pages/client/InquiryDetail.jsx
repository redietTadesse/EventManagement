import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import VendorRatingForm from '../../components/VendorRatingForm';
import { CalendarIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const InquiryDetail = () => {
  const { id } = useParams();
  const { state } = useApp();
  const { inquiries, vendors, assignments } = state;
  const inquiry = inquiries.find(i => i.id === parseInt(id));

  if (!inquiry) {
    return (
      <div>
        <PageHeader title="Not Found" />
        <p className="text-slate-500">Inquiry not found.</p>
      </div>
    );
  }

  const details = [
    { label: 'Event Type', value: inquiry.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), icon: CalendarIcon },
    { label: 'Date', value: inquiry.eventDate, icon: CalendarIcon },
    { label: 'Attendees', value: inquiry.expectedAttendees, icon: UserGroupIcon },
    { label: 'Requirements', value: inquiry.requirements || 'None specified', icon: DocumentTextIcon },
  ];

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Inquiry Details"
        subtitle={inquiry.clientName}
        action={<Link to="/client/inquiries" className="btn-outline text-sm">← Back</Link>}
      />

      <div className="card space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Inquiry #{inquiry.id}</h3>
          <StatusBadge status={inquiry.status} />
        </div>
        <div className="divide-y divide-slate-100">
          {details.map((d) => (
            <div key={d.label} className="py-2 flex items-start gap-3">
              <d.icon className="w-5 h-5 text-navy mt-0.5" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">{d.label}</p>
                <p className="text-sm font-medium text-slate-800">{d.value}</p>
              </div>
            </div>
          ))}
        </div>
        {inquiry.status === 'PROPOSAL_SENT' && (
          <Link to={`/client/proposals/${inquiry.id}`} className="btn-primary inline-block">
            View Proposal →
          </Link>
        )}
        {inquiry.status === 'EVENT_CREATED' && inquiry.event && (
          <div className="mt-4 p-4 bg-ice/20 rounded-lg border border-ice">
            <h4 className="font-semibold text-navy">Your Event</h4>
            <p className="text-sm text-slate-700">{inquiry.event.name}</p>
            {inquiry.event.venue && (
              <p className="text-sm text-slate-600 mt-1">
                📍 <span className="font-medium">{inquiry.event.venue}</span>
              </p>
            )}
            <p className="text-xs text-slate-600">Status: {inquiry.event.status} · {inquiry.event.checklist.length} checklist items</p>
          </div>
        )}

        {/* Rating UI after event completion */}
        {inquiry.event?.status === 'COMPLETED' && (
          <div className="mt-6 card">
            <h4 className="font-semibold text-slate-800 mb-1">Rate Your Vendors</h4>
            <p className="text-sm text-slate-500 mb-4">
              Your ratings help future clients pick the best vendors.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignments
                .filter(a => a.eventId === inquiry.event.id && a.status === 'ACCEPTED')
                .map(a => {
                  const vendor = vendors.find(v => v.id === a.vendorId);
                  return vendor ? (
                    <VendorRatingForm key={a.id} vendor={vendor} eventId={inquiry.event.id} />
                  ) : null;
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InquiryDetail;