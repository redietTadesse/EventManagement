import test from 'node:test';
import assert from 'node:assert/strict';
import { proposalOverlaps } from './proposalOverlapModel.js';

const venue = {id:12, setupBufferDays:1, teardownBufferDays:1};
const request = (id, eventDate, changes = {}) => ({
  id, eventDate, eventType:'meeting', status:'PROPOSAL_SENT', proposal:{venueId:12}, ...changes,
});
test('counts each overlapping pair once, including days reserved by the exhibition minimum', () => {
  const inquiries = [
    request(1,'2027-05-01',{eventType:'exhibition'}),
    request(2,'2027-05-06',{status:'PROPOSAL_ACCEPTED'}),
    request(3,'2027-05-07'),
    request(4,'2027-05-12'),
  ];
  const {pairs, skipped} = proposalOverlaps(inquiries,[venue],'2027-04-01');
  assert.deepEqual(pairs.map(p => [p.first.inquiry.id,p.second.inquiry.id,p.from,p.through]), [
    [1,2,'2027-05-05','2027-05-06'], [1,3,'2027-05-06','2027-05-06'], [2,3,'2027-05-06','2027-05-07'],
  ]);
  assert.equal(skipped,0);
});
test('ignores other rooms, past windows and converted inquiries, and identifies incomplete proposals', () => {
  const inquiries = [request(1,'2027-05-06'), request(2,'2027-05-06',{proposal:{venueId:16}}),
    request(3,'2027-05-06',{event:{id:18}}), request(4,'2027-05-05',{status:'PROPOSAL_REJECTED'}),
    request(5,'2027-05-01'), request(6,'2027-05-06',{proposal:null})];
  assert.deepEqual(proposalOverlaps(inquiries,[venue,{...venue,id:16}],'2027-05-06'), {pairs:[],skipped:1});
});
