import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { CheckIcon } from '@heroicons/react/24/solid';

const stateLabels = {
  AWAITING_SIGNATURES: 'Waiting for both signatures',
  AWAITING_RECEIPT: 'Waiting for payment receipt',
  AWAITING_REVIEW: 'Receipt awaiting review',
  RECEIPT_REJECTED: 'Receipt needs replacement',
  TERMS_CHANGED: 'The booking terms changed. Contact the assigned coordinator.',
  BOOKED: 'Payment verified and venue booking recorded',
};

function nextBookingStep(contract, canSign) {
  if (contract.availabilityWarning) return 'Resolve the venue conflict before booking or making another payment.';
  switch (contract.state) {
    case 'AWAITING_SIGNATURES':
      return canSign ? 'Review the terms and sign below.'
        : contract.client ? 'Your coordinator still needs to sign.' : 'The client still needs to sign.';
    case 'AWAITING_RECEIPT':
      return contract.client ? 'Follow the payment terms and upload your receipt.' : 'The client needs to upload proof of payment.';
    case 'RECEIPT_REJECTED':
      return contract.client ? 'Check the reason below and upload a replacement receipt.' : 'The client needs to send a replacement receipt.';
    case 'AWAITING_REVIEW':
      return contract.client ? 'Your coordinator will review your receipt before booking the venue.' : 'Download the receipt and match it to the agreed total before booking.';
    case 'BOOKED':
      return 'Open the event details to follow vendor confirmation and preparation.';
    default:
      return null;
  }
}

export default function BookingAgreement({ inquiryId, onBooked }) {
  const path = `/inquiries/${inquiryId}/booking-agreement`;
  const [contract, setContract] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [reviewed, setReviewed] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function messageFromError(err, fallback) {
    const data = err.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    return data?.message || data?.error || err.message || fallback;
  }

  useEffect(() => {
    const controller = new AbortController();
    api.get(path, { signal: controller.signal })
      .then(({ data }) => setContract(data))
      .catch(err => {
        if (!controller.signal.aborted) setError(err.response?.status === 403
          ? 'The client and assigned coordinator can access this contract.'
          : messageFromError(err, 'Could not load the booking contract.'));
      });
    return () => controller.abort();
  }, [path, refresh]);

  async function perform(action) {
    setBusy(true);
    setError('');
    try { await action(); }
    catch (err) {
      const response = err.response?.data;
      if (['VENUE_CONFLICT', 'VENUE_UNAVAILABLE'].includes(response?.code)) {
        setReviewed(false);
        setError('The venue could not be booked. The receipt is still on file. Review availability and contact the client before trying again.');
        setRefresh(value => value + 1);
      } else {
        setError(response?.message || response?.error || messageFromError(err, 'Could not complete this step. Please try again.'));
      }
    }
    finally { setBusy(false); }
  }

  async function update(suffix, data, config) {
    setContract((await api.post(path + suffix, data, config)).data);
  }

  async function download() {
    const { data } = await api.get(path + '/receipt', { responseType: 'blob' });
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' }[data.type] || 'pdf';
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-receipt.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setReviewed(true);
  }

  if (contract?.state === 'NOT_AVAILABLE') return null;
  const terms = contract?.terms;
  const canSign = contract?.state === 'AWAITING_SIGNATURES'
    && !(contract.client ? contract.clientSignedAt : contract.coordinatorSignedAt);
  const awaitingReview = contract?.state === 'AWAITING_REVIEW' && contract.canManage;
  const canUpload = contract?.client && ['AWAITING_RECEIPT', 'RECEIPT_REJECTED'].includes(contract.state);
  const booked = contract?.state === 'BOOKED';
  const milestones = [
    ['Client signed', Boolean(contract?.clientSignedAt)],
    ['Coordinator signed', Boolean(contract?.coordinatorSignedAt)],
    ['Receipt on file', Boolean(contract?.receiptUploadedAt) && !contract?.rejectionReason],
    ['Payment verified and booking recorded', booked],
  ];

  return (
    <section className="surface space-y-5 p-5 sm:p-7" aria-label="Booking contract">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="eyebrow mb-1">Booking agreement</p><h2 className="text-xl font-semibold">Contract and payment</h2></div>
        <button type="button" className="rounded border px-3 py-1" disabled={busy} onClick={() => {
          setError(''); setReviewed(false); setRefresh(value => value + 1);
        }}>Refresh status</button>
      </div>
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {!terms && !error && <p role="status">Loading contract…</p>}
      {terms && <>
        <div role="status" className={`rounded-xl px-4 py-3 text-sm ${contract.availabilityWarning ? 'bg-amber-50 text-amber-900' : 'bg-indigo-50 text-indigo-900'}`}>
          <p className="font-semibold">{contract.availabilityWarning ? 'Booking blocked by venue availability' : stateLabels[contract.state]}</p>
          {nextBookingStep(contract, canSign) && <p className="mt-1">{nextBookingStep(contract, canSign)}</p>}
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Contract milestones">
          {milestones.map(([label, done]) => <li key={label}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium ${done ? 'border-emerald-100 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'}`}>
            {done ? <CheckIcon className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />}
            <span>{label}<span className="sr-only">{done ? ', complete' : ', pending'}</span></span>
          </li>)}
        </ol>
        <dl className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2 [&_dt]:mb-1 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:text-slate-500 [&_dd]:font-medium">
          <div><dt>Proposal</dt><dd>{terms.proposalNumber}</dd></div>
          <div><dt>Client</dt><dd>{terms.client}</dd></div>
          <div><dt>Event dates</dt><dd>{terms.eventDate} through {terms.endDate}</dd></div>
          <div><dt>Venue</dt><dd>{terms.venue}</dd></div>
          <div><dt>{booked ? 'Original booking window' : 'Proposed venue reservation window'}</dt><dd>{terms.bookedFrom} through {terms.bookedThrough}</dd></div>
          <div><dt>Expected attendance</dt><dd>{terms.attendees}</dd></div>
          <div><dt>Agreed total</dt><dd className="font-semibold">ETB {terms.totalEtb.toLocaleString()}</dd></div>
          <div><dt>Services</dt><dd>{terms.services.join(', ')}</dd></div>
          {terms.proposalTerms && <div className="sm:col-span-2"><dt>Terms</dt><dd className="whitespace-pre-wrap">{terms.proposalTerms}</dd></div>}
        </dl>
        <p>Client signature: {contract.clientSignature || 'Pending'}{contract.clientSignedAt && ` (${new Date(contract.clientSignedAt).toLocaleString()})`}</p>
        <p>AICC coordinator signature: {contract.coordinatorSignature || 'Pending'}{contract.coordinatorSignedAt && ` (${new Date(contract.coordinatorSignedAt).toLocaleString()})`}</p>
        {contract.state !== 'BOOKED' && <p className="text-sm text-slate-600">
          The venue is not reserved until the assigned coordinator verifies payment and the booking succeeds.
        </p>}
        {contract.availabilityWarning && <p role="alert" className="rounded bg-amber-50 p-3 text-amber-900">
          {contract.availabilityWarning}{' '}
          {contract.client
            ? 'If you have not paid, contact your coordinator to agree on a different venue or date. If you already paid, ask them to resolve the payment before paying again.'
            : 'Contact the client to agree on a different venue or date and resolve any payment they already made.'}
          {contract.canManage && <Link className="mt-2 block font-semibold underline" to="/coordinator/calendar">Check the venue calendar</Link>}
        </p>}
        {canSign && <form className="space-y-3" onSubmit={e => {
          e.preventDefault();
          perform(() => update('/signature', { name, revision: contract.revision, consent }));
        }}>
          <label className="block">Full name to sign <input className="block rounded border p-2" required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="flex gap-2"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /> I agree to these terms and intend this typed name to be my signature.</label>
          <button className="btn-primary" disabled={busy || !consent}>Sign contract</button>
        </form>}
        {contract.rejectionReason && <p className="text-rose-700">Receipt returned: {contract.rejectionReason}</p>}
        {contract.receiptUploadedAt && <button type="button" className="rounded border px-4 py-2" disabled={busy} onClick={() => perform(download)}>Download receipt</button>}
        {canUpload && <form className="space-y-3" onSubmit={e => {
          e.preventDefault();
          if (!receipt) return;
          if (receipt.size > 5 * 1024 * 1024) { setError('The receipt must be 5 MB or smaller.'); return; }
          const form = new FormData();
          form.append('receipt', receipt);
          perform(() => update('/receipt', form, { headers: { 'Content-Type': 'multipart/form-data' } }));
        }}>
          <label className="block">Upload proof of payment (PDF, PNG or JPEG, up to 5 MB)
            <input className="block" type="file" accept=".pdf,.png,.jpeg,.jpg" required onChange={e => setReceipt(e.target.files[0])} />
          </label>
          <button className="btn-primary" disabled={busy || !receipt}>Submit receipt</button>
        </form>}
        {awaitingReview && <div className="space-y-3">
          <button type="button" className="btn-primary" disabled={busy || !reviewed || Boolean(contract.availabilityWarning)} onClick={() => perform(async () => {
            const { data } = await api.post(path + '/receipt/verify', { receiptUploadedAt: contract.receiptUploadedAt });
            onBooked?.(data);
          }).finally(() => setReviewed(false))}>Verify payment and book venue</button>
          <form className="space-y-2" onSubmit={e => {
            e.preventDefault();
            perform(async () => { await update('/receipt/reject', { reason, receiptUploadedAt: contract.receiptUploadedAt }); setReviewed(false); setReason(''); });
          }}>
            <label className="block">Reason to return the receipt <textarea className="block w-full rounded border p-2" required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
            <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy || !reason.trim()}>Return receipt to client</button>
          </form>
        </div>}
      </>}
    </section>
  );
}
