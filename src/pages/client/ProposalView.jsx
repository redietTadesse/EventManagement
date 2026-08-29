import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';

const ProposalView = () => {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const { inquiries } = state;
  const navigate = useNavigate();
  const inquiry = inquiries.find(i => i.id === parseInt(id));
  const [response, setResponse] = useState(null);

  if (!inquiry || !inquiry.proposal) {
    return (
      <div>
        <PageHeader title="Not Found" />
        <p className="text-slate-500">Proposal not found.</p>
      </div>
    );
  }

  const handleAccept = () => {
    dispatch({ type: 'ACCEPT_PROPOSAL', payload: { inquiryId: inquiry.id } });
    setResponse('accepted');
    setTimeout(() => navigate('/client/dashboard'), 1500);
  };

  const handleReject = () => {
    dispatch({ type: 'REJECT_PROPOSAL', payload: { inquiryId: inquiry.id } });
    setResponse('rejected');
    setTimeout(() => navigate('/client/dashboard'), 1500);
  };

  return (
    <div className="page-enter max-w-2xl mx-auto">
      <PageHeader
        title="Your Proposal"
        subtitle={inquiry.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        action={<button onClick={() => navigate('/client/inquiries')} className="btn-outline text-sm">← Back</button>}
      />

      {response === 'accepted' && (
        <div className="mb-4 p-3 bg-green/10 text-green rounded-lg text-sm">Proposal accepted! Your event is being planned.</div>
      )}
      {response === 'rejected' && (
        <div className="mb-4 p-3 bg-amber/10 text-amber rounded-lg text-sm">Proposal rejected. Coordinator notified.</div>
      )}

      <div className="card space-y-4">
        <div className="text-center py-4 border-b border-slate-100">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Total Investment</p>
          <p className="text-3xl font-bold text-navy">ETB {inquiry.proposal.price.toLocaleString()}</p>
        </div>
        <div className="flex justify-between py-2 border-b border-slate-100">
          <span className="text-slate-500">Venue</span>
          <span className="font-medium text-slate-800">{inquiry.proposal.venue}</span>
        </div>
        {inquiry.proposal.venueDetails && (
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Venue Details</span>
            <span className="font-medium text-slate-800 text-right max-w-xs">
              Capacity {inquiry.proposal.venueDetails.capacity} · {inquiry.proposal.venueDetails.features.join(', ')}
            </span>
          </div>
        )}
        <div className="flex justify-between py-2 border-b border-slate-100">
          <span className="text-slate-500">Terms</span>
          <span className="font-medium text-slate-800 text-right max-w-xs">{inquiry.proposal.terms}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-slate-500">Sent</span>
          <span className="font-medium text-slate-800">{new Date(inquiry.proposal.sentDate).toLocaleDateString()}</span>
        </div>

        {/* Vendor shortlist */}
        {inquiry.proposal.vendorShortlist && Object.keys(inquiry.proposal.vendorShortlist).length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-semibold text-slate-800 mb-3">Recommended Vendors</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(inquiry.proposal.vendorShortlist).map(([category, names]) => (
                <div key={category} className="p-3 bg-ice/10 rounded-lg">
                  <p className="text-xs uppercase tracking-wider text-navy font-semibold mb-1">
                    {category.replace('_', ' ')}
                  </p>
                  {names.length > 0 ? (
                    <p className="text-sm text-slate-700">{names.join(', ')}</p>
                  ) : (
                    <p className="text-sm text-slate-400">No preference suggested</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              These vendors will be considered first during auto-assignment when you accept.
            </p>
          </div>
        )}
        {!response && (
          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={handleAccept} className="btn-success">Accept Proposal</button>
            <button onClick={handleReject} className="btn-danger">Reject</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalView;