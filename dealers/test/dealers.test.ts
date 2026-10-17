import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { CatalogService } from '../../vehicle-data/src/catalog.ts';
import { MemoryCatalogStore } from '../../vehicle-data/src/store.ts';
import { MemoryListingStore } from '../../listings/src/store.ts';
import { ListingService } from '../../listings/src/service.ts';
import { LocalMediaStore, preparePhoto } from '../../listings/src/media.ts';
import { bulkData, csvTemplate, parseBulkFile, validateBulkRows, xlsxTemplate } from '../src/bulk.ts';
import { DealerCreditBillingPort } from '../src/credits.ts';
import { DealerService } from '../src/service.ts';
import { renderShowroomPage } from '../src/showroom-page.ts';
import { MemoryDealerStore } from '../src/store.ts';
import { NidVault } from '../src/vault.ts';
import type { BuyerActor, DealerActor, DealerConfig, NotificationPort, PaymentGateway } from '../src/types.ts';

const owner:DealerActor={id:'owner-1',role:'dealer_user',phoneVerified:true};
const manager:DealerActor={id:'manager-1',role:'dealer_user',phoneVerified:true};
const moderator:DealerActor={id:'moderator-1',role:'moderator'};
const system:DealerActor={id:'system-1',role:'system'};
const buyer:BuyerActor={id:'buyer-9',role:'buyer',phoneVerified:true};
const config:DealerConfig={starterCredits:2,foundingStart:'2026-01-01',foundingEnd:'2026-12-31',lowCreditThreshold:1,
  packs:[{id:'five',credits:5,priceBdt:2000,label:'5 credits'}]};
async function fixture(){
  let clockTime=new Date('2026-07-01T12:00:00Z');const clock=()=>clockTime;
  const store=new MemoryDealerStore(),catalog=new CatalogService(new MemoryCatalogStore()),billing=new DealerCreditBillingPort(store);
  const listings=new ListingService(new MemoryListingStore(),catalog,billing,clock);
  const calls:{channel:string;target:string}[]=[];
  const notifications:NotificationPort={
    async push(userId){calls.push({channel:'push',target:userId})},
    async sms(phone){calls.push({channel:'sms',target:phone})},
    async email(address){calls.push({channel:'email',target:address})},
  };
  const payments:PaymentGateway={async createCheckout(purchase){return {url:`demo:${purchase.id}`,reference:purchase.id}},
    async verifyPayment(purchase,proof){return proof===`verified:${purchase.id}`}};
  const media=new LocalMediaStore(await mkdtemp(join(tmpdir(),'carbuy-dealer-test-')));
  const dealers=new DealerService({store,listings,catalog,vault:new NidVault(randomBytes(32)),media,payments,notifications,config,clock,creditBilling:billing});
  return {store,catalog,listings,dealers,calls,advance:(days:number)=>{clockTime=new Date(clockTime.getTime()+days*86_400_000)}};
}
async function verified(f:Awaited<ReturnType<typeof fixture>>){
  const application=await f.dealers.apply(owner,{showroomName:'Trust Motors',tradeLicenceNumber:'TR-100',tin:'123456789012',ownerNid:'1234567890',
    address:'Road 2, Dhanmondi',district:'Dhaka',phones:['01712345678'],whatsapp:'01712345678',logoKey:'logo.webp',hours:'10:00–19:00'});
  const org=await f.dealers.reviewApplication(moderator,application.id,'verify','visit','Visited the showroom and checked documents');
  assert.ok(org);return {application,org};
}
async function preparedListing(f:Awaited<ReturnType<typeof fixture>>,orgId:string){
  let listing=await f.dealers.createStockDraft(owner,orgId,'CB-101','ready');
  listing=await f.dealers.saveStockDraft(owner,orgId,listing.id,{chassisNumber:'NHP10-1234567',makeId:'toyota',modelId:'aqua',
    generationId:'aqua-nhp10',gradeId:'aqua-nhp10-x-urban',manufactureYear:2018,mileageKm:45000,engineCc:1496,
    fuel:'hybrid',transmission:'cvt',body:'hatchback',condition:'reconditioned',priceBdt:2850000,negotiable:true,
    district:'Dhaka',area:'Dhanmondi',afterSalesNotes:'Six-month engine support'},listing.version);
  for(let i=0;i<4;i++){
    const image=await sharp({create:{width:800,height:600,channels:3,background:{r:30+i*40,g:80+i*20,b:120+i*10}}}).jpeg().toBuffer();
    const prepared=await preparePhoto(image);
    await f.listings.addPhoto({id:owner.id,role:'seller',phoneVerified:true,sellerType:'dealer',dealerOrgId:orgId},listing.id,prepared.photo);
  }
  return listing.id;
}

test('DLR-01/02/12: verified application keeps NID encrypted, grants starter credits once, exposes public identity',async()=>{
  const f=await fixture();const {application,org}=await verified(f);
  assert.equal((await f.store.read()).applications[0].ownerNidCiphertext.includes('1234567890'),false);
  assert.equal('ownerNidCiphertext' in (await f.dealers.myApplications(owner))[0],false);
  assert.equal((await f.dealers.reviewSensitive(moderator,application.id)).ownerNid,'1234567890');
  assert.equal(await f.dealers.creditBalance(owner,org.id),2);
  await assert.rejects(f.dealers.reviewApplication(moderator,application.id,'verify','visit','again'),/already reviewed/);
  assert.equal((await f.dealers.publicProfile(org.slug)).verified,true);
  assert.equal((await f.dealers.publicProfile(org.slug)).mapUrl.includes('Dhanmondi'),true);
  await assert.rejects(f.dealers.getOrg(manager,org.id),/role/);
});

test('DLR-03/05/06/07/08/11: stock, credits, alerts, leads, stats and auto-renew',async()=>{
  const f=await fixture();const {org}=await verified(f);const id=await preparedListing(f,org.id);
  await f.dealers.updatePreferences(owner,org.id,{pushToken:'demo-token',smsOptIn:true,emailOptIn:true,email:'owner@example.test'});
  const submitted=await f.dealers.publishStock(owner,org.id,id);
  assert.equal(submitted.status,'pending_review');assert.equal(await f.dealers.creditBalance(owner,org.id),1);
  const live=await f.listings.approve({id:moderator.id,role:'moderator'},id);assert.equal(live.status,'live');
  assert.equal((await f.dealers.publicProfile(org.slug)).stock.length,1);
  await f.listings.recordEngagement({id:system.id,role:'system'},id,'impressions');
  await f.listings.recordEngagement({id:system.id,role:'system'},id,'views');
  await f.listings.recordEngagement({id:system.id,role:'system'},id,'saves');
  const lead=await f.dealers.recordLead(system,org.id,id,'buyer-1','whatsapp');
  await f.dealers.recordLead(system,org.id,id,'buyer-1','call');
  assert.equal((await f.dealers.leads(owner,org.id)).length,1);
  assert.equal((await f.dealers.leads(owner,org.id))[0].events.length,2);
  await f.dealers.updateLead(owner,org.id,lead.id,{status:'contacted',assigneeId:owner.id,notes:'Callback tomorrow'});
  assert.ok(f.calls.some(x=>x.channel==='push'));assert.ok(f.calls.some(x=>x.channel==='sms'));assert.ok(f.calls.some(x=>x.channel==='email'));
  const stats=await f.dealers.stats(owner,org.id);assert.equal(stats.totals.impressions,1);assert.equal(stats.totals.contacts,2);
  assert.match(await f.dealers.statsCsv(owner,org.id),/CB-101/);
  await f.dealers.setAutoRenew(owner,org.id,true);f.advance(31);await f.listings.expireAndRemind({id:system.id,role:'system'});
  const renewals=await f.dealers.autoRenewExpired(system);assert.equal(renewals[0].ok,true);
  assert.equal(await f.dealers.creditBalance(owner,org.id),0);
  assert.equal((await f.dealers.stock(owner,org.id))[0].status,'live');
  assert.ok((await f.dealers.notificationsFor(owner,org.id)).some(x=>x.kind==='low_credit'));
  assert.equal((await f.dealers.bulkAction(owner,org.id,[id],'price',2900000))[0].ok,true);
  assert.equal((await f.dealers.bulkAction(owner,org.id,[id],'sold','carbuy'))[0].ok,true);
  assert.equal((await f.dealers.stock(owner,org.id))[0].status,'sold');
});

test('DLR-04/05/09: CSV/XLSX validation, idempotent pack, concierge audit',async()=>{
  const f=await fixture();const {org}=await verified(f);
  const csv=Buffer.from(csvTemplate()),xlsx=await xlsxTemplate();
  const rows=await parseBulkFile(csv,'stock.csv');assert.equal(rows.length,1);
  assert.equal((await parseBulkFile(xlsx,'stock.xlsx')).length,1);
  const report=await validateBulkRows(rows,f.catalog);assert.equal(report.valid,1);
  const imported=await f.dealers.bulkAdd(owner,org.id,csv,'stock.csv');assert.equal(imported.created.length,1);
  const photo=await sharp({create:{width:800,height:600,channels:3,background:{r:70,g:130,b:180}}}).jpeg().toBuffer();
  const matched=await f.dealers.addBulkPhoto(owner,org.id,'STK-001__1.jpg',photo);
  assert.equal(matched.photoCount,1);
  await assert.rejects(f.dealers.addBulkPhoto(owner,org.id,'OTHER__1.jpg',photo),/No draft matches/);
  const duplicate=await f.dealers.bulkReport(owner,org.id,csv,'stock.csv');assert.equal(duplicate.invalid,1);
  const purchase=await f.dealers.startPackPurchase(owner,org.id,'five','bkash');
  await assert.rejects(f.dealers.confirmPackPurchase(system,purchase.id,'wrong'),/not verified/);
  await f.dealers.confirmPackPurchase(system,purchase.id,`verified:${purchase.id}`);
  await f.dealers.confirmPackPurchase(system,purchase.id,`verified:${purchase.id}`);
  assert.equal(await f.dealers.creditBalance(owner,org.id),7);
  const concierge=await f.dealers.conciergeAdd(moderator,org.id,{stockNumber:'ADMIN-1'});
  assert.equal(concierge.data.stockNumber,'ADMIN-1');
  assert.ok((await f.dealers.auditLog(owner,org.id)).some(x=>x.action==='concierge_stock_created'));
});

test('DLR-05: rejected first-time stock restores its prepaid credit once',async()=>{
  const f=await fixture();const {org}=await verified(f);const id=await preparedListing(f,org.id);
  await f.dealers.publishStock(owner,org.id,id);
  assert.equal(await f.dealers.creditBalance(owner,org.id),1);
  await f.listings.reject({id:moderator.id,role:'moderator'},id,'Correct showroom description');
  assert.equal(await f.dealers.creditBalance(owner,org.id),2);
  assert.equal((await f.store.read()).ledger.filter(x=>x.reason==='refund').length,1);
});

async function liveListing(f:Awaited<ReturnType<typeof fixture>>,orgId:string){
  const id=await preparedListing(f,orgId);await f.dealers.publishStock(owner,orgId,id);
  await f.listings.approve({id:moderator.id,role:'moderator'},id);return id;
}

test('LST-04/DLR-04: bulk import parses two-decimal lakh prices exactly',async()=>{
  const f=await fixture();
  const rows=await parseBulkFile(Buffer.from(csvTemplate().replace('28.5 lakh','19.99 lakh')),'stock.csv');
  assert.equal(bulkData(rows[0]).priceBdt,1999000);
  assert.equal(bulkData({...rows[0],priceBdt:'1.15 lakh'}).priceBdt,115000);
  const report=await validateBulkRows(rows,f.catalog);
  assert.equal(report.valid,1);assert.equal(report.rows[0].data.priceBdt,1999000);
});

test('LST-11/DLR-11: bulk mark sold requires and records where each car sold',async()=>{
  const f=await fixture();const {org}=await verified(f);const id=await liveListing(f,org.id);
  await assert.rejects(f.dealers.bulkAction(owner,org.id,[id],'sold'),/Where did it sell/);
  await assert.rejects(f.dealers.bulkAction(owner,org.id,[id],'sold','auction' as never),/Where did it sell/);
  assert.equal((await f.dealers.stockDetail(owner,org.id,id)).status,'live');
  assert.equal((await f.dealers.bulkAction(owner,org.id,[id],'sold','showroom_trade_in'))[0].ok,true);
  const sold=await f.dealers.stockDetail(owner,org.id,id);
  assert.equal(sold.status,'sold');assert.equal(sold.soldVia,'showroom_trade_in');
  assert.ok((await f.dealers.auditLog(owner,org.id)).some(x=>x.action==='dealer_bulk_action'&&x.detail==='sold=showroom_trade_in:1/1'));
});

test('D11/MSG-04/DLR-02: numbers stay out of public data until a verified buyer reveals them as a lead',async()=>{
  const f=await fixture();const {org}=await verified(f);const id=await liveListing(f,org.id);
  const profile=await f.dealers.publicProfile(org.slug);
  const html=renderShowroomPage(profile,await f.catalog.snapshot(),{revealUrl:'/api/buyer/contact'});
  for(const text of [JSON.stringify(profile),html]){assert.equal(text.includes('1712345678'),false);assert.equal(/tel:|wa\.me/.test(text),false)}
  assert.ok(html.includes(profile.mapUrl.replaceAll('&','&amp;')));assert.ok(html.includes('10:00–19:00'));assert.ok(html.includes('Verified dealer'));
  assert.ok(html.includes(`data-listing="${id}"`));
  await assert.rejects(f.dealers.revealContact({id:'guest',role:'buyer'},org.id,id,'call'),/phone-verified buyer/);
  await assert.rejects(f.dealers.revealContact(owner as never,org.id,id,'call'),/phone-verified buyer/);
  await assert.rejects(f.dealers.revealContact(buyer,org.id,id,'sms' as never),/Call or WhatsApp/);
  assert.equal((await f.dealers.leads(owner,org.id)).length,0);
  assert.deepEqual(await f.dealers.revealContact(buyer,org.id,id,'call'),{channel:'call',phone:'+8801712345678',href:'tel:+8801712345678'});
  assert.equal((await f.dealers.revealContact(buyer,org.id,id,'whatsapp')).href,'https://wa.me/8801712345678');
  const leads=await f.dealers.leads(owner,org.id);
  assert.equal(leads.length,1);assert.equal(leads[0].buyerId,buyer.id);assert.deepEqual(leads[0].events.map(x=>x.channel),['call','whatsapp']);
  const stats=await f.dealers.stats(owner,org.id);assert.equal(stats.totals.call,1);assert.equal(stats.totals.whatsapp,1);
});

test('DLR-05/TNS-04: request changes keeps the spent credit; resubmitting needs no second credit',async()=>{
  const f=await fixture();const {org}=await verified(f);const id=await preparedListing(f,org.id);
  await f.dealers.publishStock(owner,org.id,id);
  assert.equal(await f.dealers.creditBalance(owner,org.id),1);
  const returned=await f.listings.requestChanges({id:moderator.id,role:'moderator'},id,'Add the after-sales warranty terms');
  assert.equal(returned.status,'changes_requested');assert.equal(await f.dealers.creditBalance(owner,org.id),1);
  await f.store.transaction(state=>{state.ledger.push({id:'adjust-1',orgId:org.id,delta:-1,reason:'admin',reference:'test-zero-balance',createdAt:new Date().toISOString()})});
  await f.dealers.saveStockDraft(owner,org.id,id,{afterSalesNotes:'Six-month engine and gearbox support'});
  const resubmitted=await f.dealers.publishStock(owner,org.id,id);
  assert.equal(resubmitted.status,'pending_review');assert.equal(await f.dealers.creditBalance(owner,org.id),0);
  const ledger=(await f.store.read()).ledger;
  assert.equal(ledger.filter(x=>x.reason==='listing').length,1);assert.equal(ledger.filter(x=>x.reason==='refund').length,0);
  assert.equal((await f.listings.approve({id:moderator.id,role:'moderator'},id)).status,'live');
});
