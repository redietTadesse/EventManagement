import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import RichProposalForm from '../components/RichProposalForm';
import ConversionPreviewModal from '../components/ConversionPreviewModal';
import { useApp } from '../context/AppContext';

export default function InquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, fetchInquiryById, downloadInquiryQuote, convertInquiryToEvent, previewConversion, updateProposal } = useApp();
  const { loading } = state;
  const [inquiry, setInquiry] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [venueWarning, setVenueWarning] = useState('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const loadInquiry = useCallback(async () => {
    const data = await fetchInquiryById(id);
    if (data) {
      setInquiry(data);
      setError('');
    } else {
      setError('Failed to load inquiry');
    }
  }, [id, fetchInquiryById]);

  useEffect(() => {
    loadInquiry();
  }, [loadInquiry]);

  const handleOpenPreview = async () => {
    setPreviewLoading(true);
    setError('');
    try {
      const data = await previewConversion(id);
      setPreview(data);
      setShowPreview(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadQuote = async () => {
    setQuoteLoading(true);
    setQuoteError('');
    try {
      const pdf = await downloadInquiryQuote(id);
      const url = window.URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'quote.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setQuoteError(err.response?.data?.message || 'Failed to download the quote PDF. Please try again.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirmConvert = async () => {
    setSubmitting(true);
    setError('');
    setVenueWarning('');
    try {
      // Auto-generate a sensible event name since we removed the manual input
      const defaultName = `${inquiry.eventType.charAt(0).toUpperCase() + inquiry.eventType.slice(1)} - ${inquiry.clientName}`;

      // The proposal's venue may have been booked by another event between
      // proposal and convert. The preview tells us via venue.available — never
      // send a known-booked venueId, or the backend 400s with VENUE_CONFLICT.
      // Backend also degrades best-effort, but skipping upfront is cleaner.
      const venueTaken = preview?.venue && preview.venue.available === false;
      if (venueTaken) {
        setVenueWarning(
          preview.venue.message ||
          'That venue is no longer available — converting without a venue booking. You can assign a free venue afterwards.'
        );
      }

      await convertInquiryToEvent(id, {
        name: defaultName,
        venue: venueTaken ? null : (preview?.venue?.venueName || null),
        venueId: venueTaken ? null : (preview?.venue?.venueId || null),
      });
      setShowPreview(false);
      navigate('/coordinator/dashboard');
    } catch (err) {
      console.error('Convert error:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Failed to convert';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !inquiry) {
    return (
      <Layout title="Inquiry Detail">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  if (error && !inquiry) {
    return (
      <Layout title="Inquiry Detail">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
      </Layout>
    );
  }

  const canConvert = inquiry?.status === 'PROPOSAL_ACCEPTED';
  const canSendProposal = inquiry?.status === 'INQUIRY_SUBMITTED';
  const canEditProposal = inquiry?.status === 'PROPOSAL_SENT';

  return (
    <Layout title="Inquiry Detail">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => navigate('/coordinator/inquiries')} className="text-indigo-600 hover:text-indigo-700 text-sm">
          ← Back to Inquiries
        </button>
        {inquiry.proposal && (
          <button
            type="button"
            onClick={handleDownloadQuote}
            disabled={quoteLoading}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {quoteLoading ? 'Preparing PDF...' : 'Download Quote PDF'}
          </button>
        )}
      </div>

      {quoteError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {quoteError}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-gray-800">Inquiry #{inquiry.id}</h3>
            <StatusBadge status={inquiry.status} />
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Client</p>
              <p className="font-medium">{inquiry.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Event Type</p>
              <p className="font-medium capitalize">{inquiry.eventType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Event Date</p>
              <p className="font-medium">{inquiry.eventDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Expected Attendees</p>
              <p className="font-medium">{inquiry.expectedAttendees}</p>
            </div>
            {inquiry.requestedCategories?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500">Requested Services</p>
                <p className="font-medium capitalize">{inquiry.requestedCategories.join(', ')}</p>
              </div>
            )}
            {inquiry.requirements && (
              <div>
                <p className="text-sm text-gray-500">Client Requirements</p>
                <p className="text-gray-700 bg-slate-50 p-2 rounded-md border border-slate-100">{inquiry.requirements}</p>
              </div>
            )}
          </div>
        </div>

        {canSendProposal && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Compose Proposal</h3>
            <RichProposalForm
              inquiry={inquiry}
              onSuccess={loadInquiry}
              onCancel={() => navigate('/coordinator/inquiries')}
            />
          </div>
        )}

        {canEditProposal && !showProposalForm && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-center py-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Proposal Sent</h3>
              <p className="text-sm text-gray-500 mb-4">
                A proposal has been sent to the client. You can edit it if needed.
              </p>
              {inquiry.proposal && (() => {
                try {
                  const proposal = typeof inquiry.proposal === 'string'
                    ? JSON.parse(inquiry.proposal)
                    : inquiry.proposal;
                  return (
                    <div className="text-left text-sm text-gray-600 mb-4 p-3 bg-slate-50 rounded-lg">
                      <p><strong>Venue:</strong> {proposal.venue || 'TBD'}</p>
                      <p><strong>Price:</strong> {proposal.price ? `ETB ${Number(proposal.price).toLocaleString()}` : 'TBD'}</p>
                    </div>
                  );
                } catch (e) {
                  console.error('Failed to parse proposal:', e);
                  return null;
                }
              })()}
              {inquiry.requirements && inquiry.requirements.includes('Proposal rejected') && (() => {
                // Extract the latest change request from requirements
                const lines = inquiry.requirements.split('\n').filter(line => line.includes('Proposal rejected'));
                const latestLine = lines[lines.length - 1] || '';
                // Format: "Proposal rejected on <timestamp>: <reason>"
                const changeReason = latestLine.includes(':') ? latestLine.substring(latestLine.indexOf(': ') + 2) : latestLine;
                return (
                  <div className="text-left text-sm text-rose-600 mb-4 p-3 bg-rose-50 rounded-lg border border-rose-200">
                    <p className="font-semibold">Client requested a change:</p>
                    <p className="mt-1">{changeReason}</p>
                  </div>
                );
              })()}
              <button
                onClick={() => { setShowProposalForm(true); setEditMode(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                Edit Proposal
              </button>
            </div>
          </div>
        )}

        {canEditProposal && showProposalForm && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Proposal</h3>
            <RichProposalForm
              inquiry={inquiry}
              editMode={true}
              onSuccess={() => { setShowProposalForm(false); setEditMode(false); loadInquiry(); }}
              onCancel={() => { setShowProposalForm(false); setEditMode(false); }}
            />
          </div>
        )}

        {canConvert && (
          <div className="bg-white rounded-xl shadow p-6 flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Proposal Accepted</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              The client has accepted the proposal. You are ready to create the event and assign vendors.
            </p>
            <button
              onClick={handleOpenPreview}
              disabled={previewLoading}
              className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {previewLoading ? 'Analyzing...' : 'Review & Convert to Event'}
            </button>
            {venueWarning && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 max-w-sm">
                {venueWarning}
              </p>
            )}
          </div>
        )}

        {!canConvert && !canSendProposal && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-center py-6 text-gray-500">
              <p className="text-lg font-medium">No Action Required</p>
              <p className="text-sm mt-1">
                This inquiry is currently <strong>{inquiry.status.replace(/_/g, ' ')}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {showPreview && preview && (
        <ConversionPreviewModal
          preview={preview}
          onConfirm={handleConfirmConvert}
          onCancel={() => setShowPreview(false)}
          submitting={submitting}
        />
      )}
    </Layout>
  );
}
