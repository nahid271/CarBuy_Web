import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import { demoCatalog,demoDealers,demoListings,seedDemo } from '../../search/src/demo-data.ts';
import { SearchService } from '../../search/src/service.ts';
import { MemoryListingStore } from '../../listings/src/store.ts';
import { MemoryActivityStore } from '../src/store.ts';
import { DetailError, VehicleDetailService } from '../src/service.ts';
import { renderDetail } from '../src/render.ts';

const start=new Date('2026-10-18T08:00:00.000Z');
before(async()=>seedDemo(start));
async function fixture(){
  const listings=new MemoryListingStore(),seed=await demoListings.read();
  await listings.transaction(state=>{state.listings=seed.listings;state.vehicles=seed.vehicles;state.audit=seed.audit});
  const activity=new MemoryActivityStore();let now=start;
  const clock=()=>now,search=new SearchService({listings,catalog:demoCatalog,dealers:demoDealers,clock});
  const detail=new VehicleDetailService({listings,catalog:demoCatalog,dealers:demoDealers,search,activity,clock,trackMetrics:true,
    profiles:{async privateSeller(id){return id==='demo-private'?{id,name:'Rahim Ahmed',memberSince:'2023-03-01T00:00:00Z',phoneVerified:true,
      responseHours:3,phone:'+8801700000002',whatsapp:'+8801700000002'}:undefined}},
    translation:{async translate(text,to){return to==='bn'?'বাংলা অনুবাদ':text}},
    billing:{async createCheckout(order){return {url:`/demo/${order.id}`,reference:`DEMO-${order.id}`}},
      async verify(order,proof){return proof===`demo:${order.id}`}}});
  return {detail,listings,activity,setTime:(date:Date)=>{now=date}};
}
const buyer={id:'buyer-1',phoneVerified:true};

test('public detail projects gallery, trust, seller, price and similar cars without private fields',async()=>{
  const {detail}=await fixture(),outcome=await detail.publicDetail('demo-car-001','en');assert.equal(outcome.kind,'detail');if(outcome.kind!=='detail')return;
  const row=outcome.detail;assert.equal(row.photos.length,4);assert.equal(row.priceBdt,1_300_000);assert.equal(row.negotiable,true);
  assert.equal(row.trust.auctionStatus,'verified');assert.equal(row.trust.auctionMileageKm,20_000);assert.equal(row.trust.mileageMismatch,true);
  assert.equal(row.trust.papersChecked,true);assert.equal(row.seller.type,'private');assert.equal(row.similar.length,4);
  assert.deepEqual(row.features.map(x=>x.id),['reverse_camera','airbags']);
  const publicJson=JSON.stringify(row),html=renderDetail(row,'en','http://127.0.0.1:4175');
  for(const secret of ['DEMO-PRIVATE-1','+8801700000002','private-demo','demo-seller']){
    assert.ok(!publicJson.includes(secret));assert.ok(!html.includes(secret))}
  assert.match(html,/application\/ld\+json/);assert.match(html,/og:image/);assert.match(html,/hreflang="bn"/);
  assert.match(html,/Never send a bKash or Nagad advance/);
});

test('dealer card shows verified public profile but not contact numbers',async()=>{
  const {detail}=await fixture(),outcome=await detail.publicDetail('demo-car-002','bn');assert.equal(outcome.kind,'detail');if(outcome.kind!=='detail')return;
  assert.equal(outcome.detail.seller.type,'dealer');if(outcome.detail.seller.type==='dealer')assert.equal(outcome.detail.seller.verified,true);
  assert.ok(!JSON.stringify(outcome.detail).includes('+8801700000001'));
  assert.match(outcome.detail.title,/টয়োটা/);
});

test('chassis reveal and every contact channel require identity and write audit/lead records',async()=>{
  const {detail,activity,listings}=await fixture();
  await assert.rejects(()=>detail.revealChassis(undefined,'demo-car-001'),{status:401});
  await assert.rejects(()=>detail.contact(undefined,'demo-car-001','call'),{status:401});
  await assert.rejects(()=>detail.contact({id:'buyer-1',phoneVerified:false},'demo-car-001','call'),{status:403});
  const revealed=await detail.revealChassis(buyer,'demo-car-001');assert.equal(revealed.chassisNumber,'DEMO-PRIVATE-1');
  const call=await detail.contact(buyer,'demo-car-001','call');assert.equal(call.url,'tel:+8801700000002');
  const whatsapp=await detail.contact(buyer,'demo-car-001','whatsapp');assert.equal(whatsapp.url,'https://wa.me/8801700000002');
  const chat=await detail.contact(buyer,'demo-car-001','chat');assert.equal(chat.channel,'chat');
  const state=await activity.read();assert.equal(state.reveals.length,1);assert.deepEqual(state.leads.map(x=>x.channel),['call','whatsapp','chat']);
  const row=(await listings.read()).listings.find(x=>x.id==='demo-car-001')!;
  assert.equal(row.metrics.call,1);assert.equal(row.metrics.whatsapp,1);assert.equal(row.metrics.chat,1);
});

test('report and translation flow validate input',async()=>{
  const {detail,activity}=await fixture();
  assert.equal((await detail.translate('demo-car-001','bn')).text,'বাংলা অনুবাদ');
  await assert.rejects(()=>detail.report(undefined,'demo-car-001','other'),{status:401});
  const reported=await detail.report(buyer,'demo-car-001','incorrect_details','Wrong mileage');assert.equal(reported.status,'received');
  assert.equal((await activity.read()).reports[0].note,'Wrong mileage');
  await assert.rejects(()=>detail.report(buyer,'demo-car-001','other','x'.repeat(1001)),{status:400});
});

test('paid verification is idempotent, verifies proof and records ordered state',async()=>{
  const {detail,activity}=await fixture();
  await assert.rejects(()=>detail.requestAuctionVerification(undefined,'demo-car-002'),{status:401});
  await assert.rejects(()=>detail.requestAuctionVerification(buyer,'demo-car-001'),{status:409});
  const order=await detail.requestAuctionVerification(buyer,'demo-car-002');assert.equal(order.amountBdt,500);assert.equal(order.status,'pending');
  assert.equal((await detail.requestAuctionVerification(buyer,'demo-car-002')).id,order.id);
  await assert.rejects(()=>detail.confirmVerificationPayment({role:'system'},order.id,'bad'),{status:400});
  const paid=await detail.confirmVerificationPayment({role:'system'},order.id,`demo:${order.id}`);assert.equal(paid.status,'paid');
  assert.equal((await activity.read()).orders.length,1);
  const page=await detail.publicDetail('demo-car-002','en');if(page.kind==='detail')assert.equal(page.detail.trust.auctionStatus,'verification_ordered');
  await assert.rejects(()=>detail.requestAuctionVerification(buyer,'demo-car-002'),{status:409});
});

test('sold and expired pages stay 30 days then redirect to model page',async()=>{
  const {detail,listings,setTime}=await fixture();
  await listings.transaction(state=>{const sold=state.listings.find(x=>x.id==='demo-car-001')!;
    sold.status='sold';sold.closedAt=start.toISOString();
    const expired=state.listings.find(x=>x.id==='demo-car-002')!;expired.status='expired';expired.closedAt=start.toISOString()});
  setTime(new Date(start.getTime()+29*86_400_000));
  const sold=await detail.publicDetail('demo-car-001','en'),expired=await detail.publicDetail('demo-car-002','bn');
  assert.equal(sold.kind,'detail');assert.equal(expired.kind,'detail');
  if(sold.kind==='detail')assert.equal(sold.detail.canContact,false);
  await assert.rejects(()=>detail.contact(buyer,'demo-car-001','call'),{status:410});
  setTime(new Date(start.getTime()+30*86_400_000));
  assert.deepEqual(await detail.publicDetail('demo-car-001','en'),{kind:'redirect',to:'/cars/toyota/axio'});
  assert.deepEqual(await detail.publicDetail('demo-car-002','bn'),{kind:'redirect',to:'/bn/cars/toyota/noah'});
  await listings.transaction(state=>{state.listings.find(x=>x.id==='demo-car-003')!.status='removed'});
  await assert.rejects(()=>detail.publicDetail('demo-car-003','en'),{status:404});
});
