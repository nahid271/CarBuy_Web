import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialDemoState, createDemoDraft, submitDemoListing, moderateDemoListing, searchDemoListings,
  saveDemoSearch, toggleDemoSave, changeDemoPrice, markDemoSold, startDemoChat, sendDemoMessage,
  reportDemoListing, resolveDemoReport, type NewDemoListing, type SeedCar,
} from '../../shared/demo-marketplace.ts';

const seed:SeedCar={id:'sample-1',make:'Toyota',model:'Axio',trim:'X',year:2018,condition:'Used',
  priceBdt:1_800_000,mileageKm:42_000,city:'Dhaka',area:'Uttara',seller:{name:'Sample showroom',kind:'Showroom'},
  photo:{src:'https://images.unsplash.com/photo-example'},verified:false};
const ad:NewDemoListing={make:'Honda',model:'Vezel',year:2019,condition:'Used',priceBdt:2_400_000,
  mileageKm:48_000,city:'Dhaka',area:'Mirpur',description:'Single owner sample car with service records and an inspection available.',
  photos:['data:image/jpeg;base64,AAAA'],papersDeclared:true};

test('browser demo requires seller submission and moderator approval before buyers see a new car',()=>{
  let state=initialDemoState([seed],new Date('2026-11-22T00:00:00Z'));
  state=saveDemoSearch(state,'demo-buyer','Vezel');
  state=createDemoDraft(state,'demo-private',ad,new Date('2026-11-22T00:01:00Z'));
  const id=state.listings[0].id;
  assert.equal(searchDemoListings(state,{query:'Vezel'}).length,0);
  assert.throws(()=>startDemoChat(state,'demo-buyer',id),/live cars only/);
  state=submitDemoListing(state,'demo-private',id);
  assert.equal(state.listings[0].status,'pending');
  assert.throws(()=>moderateDemoListing(state,'demo-buyer',id,true),/Moderator persona/);
  state=moderateDemoListing(state,'demo-moderator',id,true);
  assert.equal(searchDemoListings(state,{query:'Vezel'}).length,1);
  assert.ok(state.alerts.some(row=>row.accountId==='demo-buyer'&&row.text.includes('Vezel')));
  state=toggleDemoSave(state,'demo-buyer',id);
  state=changeDemoPrice(state,'demo-private',id,2_300_000);
  assert.ok(state.alerts.some(row=>row.accountId==='demo-buyer'&&row.text.includes('price dropped')));
  state=startDemoChat(state,'demo-buyer',id);
  const conversationId=state.conversations[0].id;
  state=sendDemoMessage(state,'demo-buyer',conversationId,'Can I inspect the car tomorrow?');
  state=sendDemoMessage(state,'demo-private',conversationId,'Yes, please arrange a time in the demo.');
  assert.equal(state.conversations[0].messages.length,2);
  assert.throws(()=>sendDemoMessage(state,'demo-moderator',conversationId,'hello'),/cannot join/);
  state=markDemoSold(state,'demo-private',id);
  assert.equal(searchDemoListings(state,{query:'Vezel'}).length,0);
  assert.ok(state.alerts.some(row=>row.accountId==='demo-buyer'&&row.text.includes('marked sold')));
});

test('dealer demo credits refund after rejection and reports can remove a sample car',()=>{
  let state=initialDemoState([seed]);
  state=createDemoDraft(state,'demo-dealer',ad);
  const id=state.listings[0].id;
  state=submitDemoListing(state,'demo-dealer',id);
  assert.equal(state.dealerCredits['demo-dealer'],9);
  state=moderateDemoListing(state,'demo-moderator',id,false,'Photo does not show the car clearly');
  assert.equal(state.dealerCredits['demo-dealer'],10);
  state=reportDemoListing(state,'demo-buyer','sample-1','The sample price appears misleading.');
  assert.equal(state.reports[0].status,'open');
  state=resolveDemoReport(state,'demo-moderator',state.reports[0].id,true);
  assert.equal(state.reports[0].status,'removed');
  assert.equal(searchDemoListings(state,{query:'Axio'}).length,0);
});

test('demo listing validation rejects contact details and oversized prices',()=>{
  const state=initialDemoState([]);
  assert.throws(()=>createDemoDraft(state,'demo-buyer',ad),/seller or dealer/);
  assert.throws(()=>createDemoDraft(state,'demo-private',{...ad,priceBdt:0}),/asking price/);
  assert.throws(()=>createDemoDraft(state,'demo-private',{...ad,description:'Call 01712345678 for this car and see more details later.'}),/phone numbers/);
});
