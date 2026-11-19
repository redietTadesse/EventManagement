import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingProgress, holdDeadline, inquiryNextAction } from './bookingWorkspaceModel.js';

const inquiry = { id: 12, status: 'PROPOSAL_ACCEPTED', coordinator: { id: 3, name: 'Sara' }, proposal: '{}' };
const now = Date.parse('2027-01-01T10:00:00Z');
const signed = { state: 'AWAITING_RECEIPT', clientSignedAt: '2027-01-01T08:00:00Z', coordinatorSignedAt: '2027-01-01T09:00:00Z', paymentHoldActive: true, paymentDueAt: '2027-01-08T09:00:00Z' };

test('acceptance and two signatures never imply payment verification or a final booking', () => {
  const progress = bookingProgress(inquiry, signed);
  assert.equal(progress.find(step => step.id === 'agreement').state, 'complete');
  assert.equal(progress.find(step => step.id === 'payment').state, 'current');
  assert.equal(progress.find(step => step.id === 'booked').state, 'upcoming');
  assert.equal(bookingProgress(inquiry, null).find(step => step.id === 'agreement').state, 'current');
});
test('receipt upload directs staff to review without displaying a booked venue', () => {
  const contract = { ...signed, state: 'AWAITING_REVIEW', receiptUploadedAt: '2027-01-01T09:30:00Z' };
  assert.match(inquiryNextAction(inquiry, contract, false, now).title, /ready for your review/);
  assert.equal(bookingProgress(inquiry, contract).at(-1).done, false);
  assert.equal(bookingProgress(inquiry, { ...contract, state: 'BOOKED' }).at(-1).done, true);
});
test('expired holds and changed terms cannot appear as an active booking', () => {
  assert.match(inquiryNextAction(inquiry, signed, false, Date.parse('2027-01-09')).title, /hold has ended/);
  assert.equal(holdDeadline(signed, Date.parse('2027-01-09')).value, 'Hold expired');
  assert.equal(bookingProgress(inquiry, { ...signed, state: 'TERMS_CHANGED' }).find(step => step.id === 'agreement').done, false);
  assert.match(inquiryNextAction(inquiry, { ...signed, availabilityWarning: 'Hall unavailable' }, false, now).title, /Resolve/);
  assert.equal(holdDeadline({ ...signed, state: 'BOOKED' }, now), null);
});
test('ownership and terminal states lead to review rather than changing another coordinator’s work', () => {
  assert.equal(inquiryNextAction(inquiry, signed, true, now).target, 'request');
  assert.equal(inquiryNextAction({ status: 'INQUIRY_SUBMITTED' }, null, false).target, 'ownership');
  assert.equal(inquiryNextAction({ ...inquiry, status: 'PROPOSAL_REJECTED' }, null, false).target, 'history');
  assert.equal(inquiryNextAction({ ...inquiry, event: { id: 88 } }, null, false).href, '/coordinator/events/88');
});
