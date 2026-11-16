import test from 'node:test';
import assert from 'node:assert/strict';
import {clientRequest} from './clientRequestModel.js';
test('accepted proposals point to agreement without claiming signatures or payment are complete',()=>{
 const view=clientRequest({id:1,status:'PROPOSAL_ACCEPTED'});
 assert.equal(view.href,'/client/inquiries/1');assert.equal(view.steps[2].done,true);
 assert.equal(view.steps[3].done,false);assert.match(view.note,/signatures/);
});
test('linked event status controls the next step and ended outcomes stay distinct',()=>{
 const view=clientRequest({id:1,status:'EVENT_CREATED',event:{id:2,status:'CANCELLED'}});
 assert.equal(view.status,'CANCELLED');assert.equal(view.terminal,true);assert.equal(view.href,'/client/events/2');
 assert.equal(view.action,'View outcome');
 const rejected=clientRequest({id:3,status:'PROPOSAL_REJECTED'});
 assert.equal(rejected.steps[2].done,false);assert.equal(rejected.terminal,true);
});
