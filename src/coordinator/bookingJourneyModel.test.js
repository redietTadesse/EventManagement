import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingJourney} from './bookingJourneyModel.js';
test('uses the linked event status and counts each inquiry once',()=>{
  const result=bookingJourney([{id:1,status:'EVENT_CREATED',event:{id:9,status:'CONFIRMED'}},{id:2,status:'PROPOSAL_SENT'},
    {id:2,status:'PROPOSAL_SENT'}],'all');
  assert.equal(result.total,2);
  assert.equal(result.stages.find(s=>s.id==='confirmed').rows.length,1);
  assert.equal(result.stages.find(s=>s.id==='vendors').rows.length,0);
  assert.equal(result.stages.find(s=>s.id==='proposal').rows[0].href,'/coordinator/inquiries/2');
});
test('my work includes unclaimed inquiries and preserves current ownership',()=>{
 const input=[{id:1,status:'INQUIRY_SUBMITTED'},{id:2,status:'PROPOSAL_ACCEPTED',coordinator:{id:4}},
 {id:3,status:'AWAITING_VENDORS',coordinator:{id:5},event:{id:10,status:'AWAITING_VENDORS'}}];
 assert.equal(bookingJourney(input,'mine',4).total,2);
 const all=bookingJourney(input,'all',4);assert.equal(all.total,3);
 assert.equal(all.stages.find(s=>s.id==='vendors').rows[0].href,'/coordinator/events/10?tab=vendors');
 assert.equal(input[2].status,'AWAITING_VENDORS');
});
test('does not hide unknown statuses and sorts recently updated work first',()=>{
 const result=bookingJourney([{id:1,status:'PROPOSAL_SENT',updatedAt:'2026-11-01'},
 {id:2,status:'PROPOSAL_SENT',updatedAt:'2026-11-15'},{id:3,status:null}],'all');
 assert.deepEqual(result.stages.find(s=>s.id==='proposal').rows.map(row=>row.id),[2,1]);
 assert.equal(result.stages.find(s=>s.id==='unknown').rows.length,1);
 assert.equal(result.stages.reduce((sum,s)=>sum+s.rows.length,0),result.total);
});
