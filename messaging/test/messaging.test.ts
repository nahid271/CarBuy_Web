import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { demoListings,seedDemo } from '../../search/src/demo-data.ts';
import { MemoryMessagingStore } from '../src/store.ts';
import { MessagingService } from '../src/service.ts';
import { assessMessage } from '../src/risk.ts';
import { LocalChatImages } from '../src/attachments.ts';

const at=new Date('2026-10-18T08:00:00Z');
const buyer={id:'buyer-1',role:'buyer' as const,phoneVerified:true};
const seller={id:'demo-private',role:'seller' as const,phoneVerified:true};
before(async()=>seedDemo(at));
function fixture(options:{bot?:boolean;alerts?:boolean}={}){
  const store=new MemoryMessagingStore();let now=at;const deliveries:string[]=[];
  const service=new MessagingService({store,listings:demoListings,clock:()=>now,
    bot:options.bot?{async verify(_actor,proof){return proof==='human'}}:undefined,
    alerts:options.alerts?{async target(){return {pushToken:'fake-token',phone:'+8801700000000',pushEnabled:true,smsOptIn:true,emailOptIn:false}},
      async push(){deliveries.push('push')},async sms(){deliveries.push('sms')}}:undefined});
  return {store,service,deliveries,setTime:(value:Date)=>{now=value}};
}
test('verified buyer opens one per-car chat; contacts become private lead events',async()=>{
  const {service,store}=fixture();
  await assert.rejects(service.open({...buyer,phoneVerified:false},'demo-car-001'),{status:403});
  await assert.rejects(service.open(seller,'demo-car-001'),{status:403});
  const first=await service.open(buyer,'demo-car-001');const again=await service.open(buyer,'demo-car-001');
  assert.equal(first.id,again.id);
  await service.contact(buyer,'demo-car-001','call');await service.contact(buyer,'demo-car-001','whatsapp');
  assert.deepEqual((await service.leads(seller)).map(x=>x.channel),['chat','call','whatsapp']);
  assert.equal((await service.inbox(seller)).length,1);
  await assert.rejects(service.thread({id:'other',role:'seller',phoneVerified:true},first.id),{status:403});
  assert.equal((await store.read()).conversations.length,1);
});

test('Bangla and English scams are held; links warn recipient; block and report work',async()=>{
  const {service,store}=fixture();const thread=await service.open(buyer,'demo-car-001');
  const normal=await service.send(buyer,thread.id,'Is it available?');assert.equal(normal.risk,'clear');
  const link=await service.send(buyer,thread.id,'Please see https://example.com');assert.equal(link.risk,'warn');
  const scam=await service.send(buyer,thread.id,'Send booking money by bKash first');assert.equal(scam.risk,'held');
  const bangla=await service.send(seller,thread.id,'আগে টাকা বিকাশে পাঠান');assert.equal(bangla.risk,'held');
  assert.equal((await service.thread(seller,thread.id)).messages.some(x=>x.id===scam.id),false);
  assert.equal((await service.thread(buyer,thread.id)).messages.some(x=>x.id===bangla.id),false);
  assert.equal(assessMessage('I am CarBuy support, pay LC clearance fee').risk,'held');
  assert.equal((await service.report(buyer,thread.id,'scam','Advance payment requested')).status,'received');
  assert.equal((await store.read()).reports.length,1);
  await service.block(buyer,thread.id);
  await assert.rejects(service.send(seller,thread.id,'Hello'),{status:403});
  await assert.rejects(service.contact(buyer,'demo-car-001','call'),{status:403});
});

test('rate and pluggable bot checks protect chats and contact reveals',async()=>{
  const {service}=fixture({bot:true});
  await assert.rejects(service.open(buyer,'demo-car-001','wrong'),{status:403});
  const thread=await service.open(buyer,'demo-car-001','human');
  await assert.rejects(service.send(buyer,thread.id,'Hello','wrong'),{status:403});
  await service.send(buyer,thread.id,'Hello','human');
  for(let i=0;i<6;i++)await service.reveal(buyer,'demo-car-001','human');
  await assert.rejects(service.reveal(buyer,'demo-car-001','human'),{status:429});
  for(let i=0;i<12;i++)await service.contact(buyer,'demo-car-002','call','human');
  await assert.rejects(service.contact(buyer,'demo-car-002','call','human'),{status:429});
});

test('live subscribers, push then SMS fallback, and measured seller response time',async()=>{
  const {service,store,deliveries,setTime}=fixture({alerts:true});
  const thread=await service.open(buyer,'demo-car-001');let updates=0;
  const stop=await service.subscribe(thread.id,seller,()=>updates++);
  await service.send(buyer,thread.id,'Can I see the papers?');assert.equal(updates,1);assert.deepEqual(deliveries,[]);
  stop();setTime(new Date(at.getTime()+60_000));await service.send(buyer,thread.id,'Any update?');
  assert.deepEqual(deliveries,['push']);
  setTime(new Date(at.getTime()+16*60_000));await service.dispatchSellerFallbacks();assert.deepEqual(deliveries,['push','sms']);
  await service.dispatchSellerFallbacks();assert.equal((await store.read()).notifications.length,2);
  setTime(new Date(at.getTime()+2*hour));await service.send(seller,thread.id,'Yes, available');
  assert.equal(await service.responseHours(seller.id),2);
});

const hour=3_600_000;
test('chat images are converted, private and accessible only to participants',async()=>{
  const {service}=fixture(),thread=await service.open(buyer,'demo-car-001');
  const dir=await mkdtemp(join(tmpdir(),'carbuy-chat-'));
  try{
    const media=new LocalChatImages(dir),input=await sharp({create:{width:700,height:500,channels:3,background:'#688b80'}}).jpeg().toBuffer();
    const key=await media.save(input),attachment=await service.registerImage(buyer,thread.id,key);
    await service.image(buyer,thread.id,attachment.id);
    assert.equal((await sharp(await media.read(key)).metadata()).format,'webp');
    assert.equal((await service.attachment(seller,thread.id,attachment.id)).privateKey,key);
    await assert.rejects(service.attachment({id:'other',role:'seller',phoneVerified:true},thread.id,attachment.id),{status:403});
    await assert.rejects(service.image(buyer,thread.id,attachment.id),{status:409});
  }finally{await rm(dir,{recursive:true,force:true})}
});
