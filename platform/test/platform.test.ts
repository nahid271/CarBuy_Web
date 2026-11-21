import assert from 'node:assert/strict';
import test from 'node:test';
import { AnalyticsService, attribution } from '../src/analytics.ts';
import { CommerceService, demoPrices, type Order, type PaymentGateway } from '../src/commerce.ts';
import { NotificationService } from '../src/notifications.ts';
import { enabledMarket, markets } from '../../shared/markets.ts';

test('notifications are bilingual, respect channel preferences and deduplicate retries',()=>{
  const notices=new NotificationService();
  notices.setPreference('buyer-1','new_chat','email',false);
  const event={id:'message-1',kind:'new_chat' as const,recipient:{id:'buyer-1',language:'bn' as const,
    hasApp:true,email:'buyer@example.test',phone:'+8801700000000',smsOptIn:false}};
  const first=notices.queue(event);
  assert.deepEqual(first.map(x=>x.channel),['push','in_app']);
  assert.equal(first[0].title,'নতুন বার্তা');
  assert.equal(notices.queue(event).length,0);
  assert.equal(notices.inbox('buyer-1').length,1);
  assert.ok(notices.markRead('buyer-1',first[1].id).readAt);
});

test('analytics needs consent, discards unapproved properties, and removes withdrawn events',()=>{
  const analytics=new AnalyticsService(),id='visitor_123';
  assert.equal(analytics.track(id,'search_performed',{result_count:5}),null);
  analytics.setConsent(id,true);
  const event=analytics.track(id,'search_performed',{result_count:5,filter_count:2,phone:'+8801700000000'});
  assert.deepEqual(event?.properties,{result_count:5,filter_count:2});
  assert.deepEqual(attribution({url:'https://carbuy.test/?utm_source=facebook&utm_campaign=launch',
    referrer:'https://example.com/path'}),{utm_source:'facebook',utm_campaign:'launch',referrer_host:'example.com'});
  analytics.setConsent(id,false);
  assert.equal(analytics.exportFor(id).length,0);
});

test('paid products need verified amount and unique gateway transaction before entitlements',async()=>{
  let amount=0,transaction='txn-1',refundFound=true;
  const gateway:PaymentGateway={
    async create(order){return {url:`https://checkout.example.test/${order.id}`,reference:order.id}},
    async verify(){return {transactionId:transaction,amountBdt:amount,currency:'BDT',method:'bkash'}},
    async refund(){return refundFound?{reference:'refund-1'}:null},
  };
  const commerce=new CommerceService(gateway,{pricesBdt:demoPrices,vatRate:0.1});
  commerce.createCoupon({code:'LAUNCH',discountBdt:500,expiresAt:'2030-01-01T00:00:00.000Z',maxUses:1});
  const order=await commerce.createOrder({buyerId:'dealer-1',dealerId:'dealer-1',product:'dealer_10',coupon:'LAUNCH'});
  assert.equal(order.totalBdt,2200);
  assert.equal(commerce.credits('dealer-1'),0);
  await assert.rejects(commerce.settle(order.id,'proof'),/could not be verified/);
  amount=order.totalBdt;
  await commerce.settle(order.id,'proof');
  assert.equal(commerce.credits('dealer-1'),10);
  await commerce.settle(order.id,'proof');
  assert.equal(commerce.credits('dealer-1'),10);
  assert.equal(commerce.receipt('dealer-1',order.id).vatBdt,200);
  await assert.rejects(commerce.createOrder({buyerId:'dealer-2',dealerId:'dealer-2',product:'dealer_10',coupon:'LAUNCH'}),/Coupon unavailable/);
  transaction='txn-2';
  refundFound=false;
  assert.equal((await commerce.refund(order.id)).status,'refund_pending');
  assert.equal(commerce.credits('dealer-1'),10);
  refundFound=true;
  assert.equal((await commerce.refund(order.id)).status,'refunded');
  assert.equal(commerce.credits('dealer-1'),0);
  const largePack=await commerce.createOrder({buyerId:'dealer-2',dealerId:'dealer-2',product:'dealer_200'});
  amount=largePack.totalBdt;transaction='txn-3';
  await commerce.settle(largePack.id,'proof');
  assert.equal(commerce.credits('dealer-2'),200);
});

test('market configuration keeps discovery countries disabled',()=>{
  assert.equal(enabledMarket('BD').currency,'BDT');
  assert.deepEqual(markets.BD.languages,['bn','en']);
  assert.throws(()=>enabledMarket('ID'),/requires discovery/);
  assert.throws(()=>enabledMarket('TH'),/requires discovery/);
});

test('auction sheet fulfilment refunds when no sheet is found',async()=>{
  const gateway:PaymentGateway={
    async create(order){return {url:`https://checkout.example.test/${order.id}`,reference:order.id}},
    async verify(order:Order){return {transactionId:'sheet-txn',amountBdt:order.totalBdt,currency:'BDT',method:'card'}},
    async refund(){return {reference:'sheet-refund'}},
  };
  const commerce=new CommerceService(gateway);
  const order=await commerce.createOrder({buyerId:'buyer-1',listingId:'car-1',product:'auction_sheet'});
  await commerce.settle(order.id,'proof');
  assert.equal(commerce.sheets()[0].status,'pending');
  assert.equal((await commerce.completeSheet(order.id,{found:false,partnerReference:'partner-1'})).status,'not_found');
  assert.equal(commerce.history('buyer-1')[0].status,'refunded');
});
