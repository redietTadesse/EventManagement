import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function InquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const inquiries = state?.inquiries || [];
  const inquiry = inquiries.find(i => i.id === Number(id));

  if (!inquiry) {
    return (
      <Layout title="Inquiry Detail">
        <div className="card text-center py-12 text-slate-500">Inquiry not found</div>
      </Layout>
    );
  }

  return (
    <Layout title="Inquiry Detail">
      <button
        onClick={() => navigate('/coordinator/inquiries')}
        className="text-sm text-navy hover:text-navy/80 mb-4"
      >
        ← Back to Inquiries
      </button>
      <div className="card">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-slate-800">Inquiry #{inquiry.id}</h3>
          <StatusBadge status={inquiry.status} />
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm text-slate-500">Client</p>
            <p className="font-medium">{inquiry.clientName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Event Type</p>
            <p className="font-medium capitalize">{inquiry.eventType}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Event Date</p>
            <p className="font-medium">{inquiry.eventDate ? new Date(inquiry.eventDate).toLocaleDateString() : 'TBD'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Expected Attendees</p>
            <p className="font-medium">{inquiry.expectedAttendees || 0}</p>
          </div>
          {inquiry.requirements && (
            <div>
              <p className="text-sm text-slate-500">Requirements</p>
              <p className="text-slate-700">{inquiry.requirements}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}