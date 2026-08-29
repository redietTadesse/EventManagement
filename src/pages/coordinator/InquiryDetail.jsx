import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import RichProposalForm from '../../components/RichProposalForm';

const InquiryDetail = () => {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const { inquiries } = state;
  const navigate = useNavigate();
  const inquiry = inquiries.find(i => i.id === parseInt(id));
  const [proposalSent, setProposalSent] = useState(false);

  if (!inquiry) {
    return (
      <div>
        <PageHeader title="Not Found" />
        <p className="text-slate-500">Inquiry not found.</p>
      </div>
    );
  }

  const rows = [
    { label: 'Client', value: inquiry.clientName },
    { label: 'Event Type', value: inquiry.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
    { label: 'Date', value: inquiry.eventDate },
    { label: 'Attendees', value: inquiry.expectedAttendees },
    { label: 'Requirements', value: inquiry.requirements || 'None' },
    { label: 'Status', value: <StatusBadge status={inquiry.status} /> },
  ];

  return (
    <div className="page-enter max-w-2xl">
      <PageHeader
        title="Inquiry Details"
        subtitle={`Inquiry #${inquiry.id} · ${inquiry.clientName}`}
        action={<button onClick={() => navigate('/coordinator/inquiries')} className="btn-outline text-sm">← Back</button>}
      />

      {proposalSent && (
        <div className="mb-4 p-3 bg-green/10 text-green rounded-lg text-sm">
          Proposal generated & sent to the client! Redirecting…
        </div>
      )}

      <div className="card divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.label} className="py-2 flex justify-between items-center gap-4">
            <span className="text-sm text-slate-500">{r.label}</span>
            <span className="text-sm font-medium text-slate-800">{typeof r.value === 'string' ? r.value : r.value}</span>
          </div>
        ))}
        {inquiry.status === 'INQUIRY_SUBMITTED' && !proposalSent && (
          <div className="pt-4">
            <RichProposalForm
              inquiry={inquiry}
              onSubmit={(proposal) => {
                dispatch({
                  type: 'SEND_PROPOSAL',
                  payload: { inquiryId: inquiry.id, ...proposal },
                });
                setProposalSent(true);
                setTimeout(() => navigate('/coordinator/dashboard'), 1500);
              }}
              onCancel={() => navigate('/coordinator/inquiries')}
            />
          </div>
        )}
        {inquiry.status !== 'INQUIRY_SUBMITTED' && (
          <div className="pt-4 text-sm text-slate-500">A proposal has already been sent for this inquiry.</div>
        )}
      </div>
    </div>
  );
};

export default InquiryDetail;