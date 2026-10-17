import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CatalogService } from '../../vehicle-data/src/catalog.ts';
import { MemoryCatalogStore } from '../../vehicle-data/src/store.ts';
import { bodyValues, fuelValues, transmissionValues } from '../../vehicle-data/src/values.ts';
import { JsonListingStore } from '../../listings/src/store.ts';
import { ListingService } from '../../listings/src/service.ts';
import { LocalMediaStore, preparePhoto } from '../../listings/src/media.ts';
import { validateForSubmission } from '../../listings/src/validation.ts';
import { DealerCreditBillingPort } from './credits.ts';
import { csvTemplate, xlsxTemplate } from './bulk.ts';
import { DealerService, demoDealerConfig } from './service.ts';
import { JsonDealerStore } from './store.ts';
import { localDemoVault } from './vault.ts';
import type { DealerActor, NotificationPort, PaymentGateway } from './types.ts';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const local=join(root,'.local');
const port=Number(process.env.PORT??4174);
const owner:DealerActor={id:'demo-dealer-owner',role:'dealer_user',phoneVerified:true};
const admin:DealerActor={id:'demo-moderator',role:'moderator'};
const system:DealerActor={id:'demo-system',role:'system'};
const catalog=new CatalogService(new MemoryCatalogStore());
const dealerStore=new JsonDealerStore(join(local,'dealers.json'));
const listingStore=new JsonListingStore(join(local,'listings.json'));
const billing=new DealerCreditBillingPort(dealerStore);
const listings=new ListingService(listingStore,catalog,billing);
const media=new LocalMediaStore(join(local,'media'));
const paymentGateway:PaymentGateway={
  async createCheckout(purchase){return {url:`/demo/checkout/${purchase.id}`,reference:`DEMO-${purchase.id}`}},
  async verifyPayment(purchase,proof){return proof===`demo:${purchase.id}`},
};
const notificationPort:NotificationPort={async push(){},async sms(){},async email(){}};
const dealers=new DealerService({store:dealerStore,listings,catalog,vault:await localDemoVault(join(local,'nid.key')),
  media,payments:paymentGateway,notifications:notificationPort,config:demoDealerConfig,creditBilling:billing});

async function seed(){
  const existing=(await dealers.myApplications(owner)).find(x=>x.status==='verified');
  if(existing?.orgId&&(await dealers.getOrg(owner,existing.orgId)).logoKey!=='demo')return;
  const logoSvg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="96" fill="#125039"/><text x="256" y="315" text-anchor="middle" font-family="Arial" font-size="205" font-weight="bold" fill="#f0bd67">DM</text></svg>';
  const logoKey=await media.savePublic(randomUUID(),'webp',await sharp(Buffer.from(logoSvg)).webp({quality:85}).toBuffer());
  if(existing?.orgId){await dealers.updateProfile(owner,existing.orgId,{logoKey});return}
  const app=await dealers.apply(owner,{showroomName:'CarBuy Demo Motors',tradeLicenceNumber:'DEMO-TRADE-001',tin:'000000000000',
    ownerNid:'0000000000',address:'House 12, Road 8, Dhanmondi',district:'Dhaka',phones:['01700000000'],whatsapp:'01700000000',
    logoKey,hours:'Sat–Thu · 10:00–19:00',about:'A sample verified showroom for exploring the dealer MVP.'});
  await dealers.reviewApplication(admin,app.id,'verify','video_call','Seeded demonstration record; no real identity verified.');
}
await seed();

function json(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value))}
async function requestBody(req:IncomingMessage):Promise<any>{
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>18*1024*1024)throw new Error('Request exceeds 18 MB');chunks.push(chunk)}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
}
async function fileBytes(value:any):Promise<Buffer>{
  if(typeof value!=='string'||value.length>24*1024*1024)throw new Error('Invalid upload');
  return Buffer.from(value,'base64');
}
async function saveLogo(value:any):Promise<string>{
  const bytes=await fileBytes(value);
  if(bytes.length>5*1024*1024)throw new Error('Logo limit is 5 MB');
  const output=await sharp(bytes,{limitInputPixels:10_000_000,failOn:'error'}).rotate().resize(512,512,{fit:'contain',background:'#ffffff'}).webp({quality:84}).toBuffer();
  return media.savePublic(randomUUID(),'webp',output);
}
async function orgId():Promise<string>{const app=(await dealers.myApplications(owner)).find(x=>x.status==='verified'&&x.orgId);if(!app?.orgId)throw new Error('Apply for dealer verification first');return app.orgId}
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.avif':'image/avif'};
const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]!));
async function showroomPage(slug:string):Promise<string>{
  const profile=await dealers.publicProfile(slug),snapshot=await catalog.snapshot();
  const modelName=(id?:string)=>snapshot.models.find(x=>x.id===id)?.name.en??id??'Model';
  const makeName=(id?:string)=>snapshot.makes.find(x=>x.id===id)?.name.en??id??'Vehicle';
  const cards=profile.stock.map(car=>`<article class="panel" style="padding:0;overflow:hidden">
    <div style="height:160px;background:#e2ede4;display:grid;place-items:center">${car.coverKey?`<img src="/media/public/${escapeHtml(car.coverKey)}" alt="${escapeHtml(makeName(car.makeId))} ${escapeHtml(modelName(car.modelId))}" style="width:100%;height:100%;object-fit:cover">`:'<span style="font-size:50px;color:#6e9e7c">◈</span>'}</div>
    <div style="padding:17px"><span class="pill">${escapeHtml(car.stockStatus==='preorder'?'Pre-order':'Ready')}</span><h2 style="margin:11px 0 4px">${escapeHtml(makeName(car.makeId))} ${escapeHtml(modelName(car.modelId))}</h2><p class="smalltext muted">${escapeHtml(car.year)} · ${escapeHtml(car.stockNumber)} · ${escapeHtml(car.area)}, ${escapeHtml(car.district)}</p><b style="font-size:18px">৳${Number(car.priceBdt??0).toLocaleString('en-BD')}</b>${car.expectedArrival?`<p class="smalltext">Expected ${escapeHtml(car.expectedArrival)}</p>`:''}</div></article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(profile.name)} · CarBuy</title><link rel="stylesheet" href="/styles.css"></head><body>
    <header class="topbar"><a class="brand" href="/"><span class="brand-mark">C<span>›</span></span><span>CarBuy <small>VERIFIED DEALER</small></span></a><span class="demo-badge">LOCAL DEMO</span></header>
    <main class="main" style="max-width:1050px"><div class="hero" style="margin-bottom:20px"><div style="display:flex;gap:18px;align-items:center">${profile.logoKey!=='demo'?`<img class="brandlogo" src="/media/public/${escapeHtml(profile.logoKey)}" alt="${escapeHtml(profile.name)} logo">`:''}<div><span class="pill">✓ Verified dealer</span><h1 style="margin:10px 0 5px;font-size:30px">${escapeHtml(profile.name)}</h1><p>${escapeHtml(profile.address)}, ${escapeHtml(profile.district)}</p></div></div></div>
    <div class="two-col" style="grid-template-columns:1fr 1fr"><section class="panel"><h2>Visit the showroom</h2><p>${escapeHtml(profile.address)}, ${escapeHtml(profile.district)}</p><p class="smalltext muted">${escapeHtml(profile.hours)}</p><div class="form-actions"><a class="button" href="${escapeHtml(profile.mapUrl)}" target="_blank" rel="noopener noreferrer">Open map ↗</a><a class="button secondary" href="tel:${escapeHtml(profile.phones[0])}">Call ${escapeHtml(profile.phones[0])}</a><a class="button secondary" href="https://wa.me/${escapeHtml(profile.whatsapp.replace(/\D/g,''))}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a></div></section><section class="panel"><h2>About us</h2><p class="smalltext muted">${escapeHtml(profile.about)}</p><p class="smalltext muted">Verified on ${escapeHtml(profile.verifiedAt.slice(0,10))}.</p></section></div>
    <div class="page-head" style="margin-top:16px"><div><div class="eyebrow">Showroom inventory</div><h2>${profile.stock.length} live cars</h2><p class="sub">Current stock from this verified dealer.</p></div></div><div class="cards">${cards||'<div class="empty"><strong>No live cars yet</strong>Check back for new arrivals.</div>'}</div></main></body></html>`;
}

createServer(async(req,res)=>{
  try{
    const url=new URL(req.url??'/',`http://127.0.0.1:${port}`),path=url.pathname,method=req.method;
    if(method==='GET'&&path==='/api/bootstrap'){
      const id=await orgId();
      json(res,200,{demo:true,config:demoDealerConfig,org:await dealers.getOrg(owner,id),applications:await dealers.myApplications(owner),
        balance:await dealers.creditBalance(owner,id),catalog:await catalog.snapshot(),values:{body:bodyValues,fuel:fuelValues,transmission:transmissionValues}});return;
    }
    if(method==='POST'&&path==='/api/application'){json(res,201,await dealers.apply(owner,await requestBody(req)));return}
    if(method==='POST'&&path==='/api/application-logo'){const b=await requestBody(req);json(res,200,{logoKey:await saveLogo(b.bytesBase64)});return}
    if(method==='POST'&&path==='/api/demo/review'){
      const b=await requestBody(req);json(res,200,await dealers.reviewApplication(admin,b.applicationId,b.decision,b.method,b.note));return;
    }
    if(method==='GET'&&path==='/api/stock'){json(res,200,await dealers.stock(owner,await orgId()));return}
    if(method==='POST'&&path==='/api/stock'){const b=await requestBody(req);json(res,201,await dealers.createStockDraft(owner,await orgId(),b.stockNumber,b.stockStatus));return}
    const stock=/^\/api\/stock\/([a-f0-9-]+)(?:\/(.+))?$/.exec(path);
    if(stock){const [,id,action]=stock,org=await orgId();
      if(method==='GET'&&!action){json(res,200,await dealers.stockDetail(owner,org,id));return}
      if(method==='GET'&&action==='validate'){json(res,200,{errors:await validateForSubmission(await dealers.stockDetail(owner,org,id),catalog)});return}
      if(method==='PATCH'&&!action){const b=await requestBody(req);json(res,200,await dealers.saveStockDraft(owner,org,id,b.patch,b.version));return}
      if(method==='POST'&&action==='photo'){
        const b=await requestBody(req),prepared=await preparePhoto(await fileBytes(b.bytesBase64));
        prepared.photo.webpKey=await media.savePublic(prepared.photo.id,'webp',prepared.webp);
        prepared.photo.avifKey=await media.savePublic(prepared.photo.id,'avif',prepared.avif);
        const listing=await dealers.stockDetail(owner,org,id);
        json(res,200,await listings.addPhoto({id:owner.id,role:'seller',phoneVerified:true,sellerType:'dealer',dealerOrgId:org},listing.id,prepared.photo));return;
      }
      if(method==='POST'&&action==='publish'){json(res,200,await dealers.publishStock(owner,org,id));return}
      if(method==='POST'&&action==='demo-approve'){json(res,200,await listings.approve({id:admin.id,role:'moderator'},id));return}
      if(method==='POST'&&action==='demo-reject'){const b=await requestBody(req);json(res,200,await listings.reject({id:admin.id,role:'moderator'},id,b.note||'Please correct the car details'));return}
      if(method==='POST'&&action==='engagement'){const b=await requestBody(req);await listings.recordEngagement({id:system.id,role:'system'},id,b.kind);json(res,200,{ok:true});return}
    }
    if(method==='GET'&&path==='/api/template.csv'){res.writeHead(200,{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="CarBuy-dealer-stock-template.csv"'});res.end(csvTemplate());return}
    if(method==='GET'&&path==='/api/template.xlsx'){res.writeHead(200,{'content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','content-disposition':'attachment; filename="CarBuy-dealer-stock-template.xlsx"'});res.end(await xlsxTemplate());return}
    if(method==='POST'&&path==='/api/bulk/report'){const b=await requestBody(req);json(res,200,await dealers.bulkReport(owner,await orgId(),await fileBytes(b.bytesBase64),b.fileName));return}
    if(method==='POST'&&path==='/api/bulk/import'){const b=await requestBody(req);json(res,200,await dealers.bulkAdd(owner,await orgId(),await fileBytes(b.bytesBase64),b.fileName));return}
    if(method==='POST'&&path==='/api/bulk/photo'){const b=await requestBody(req);json(res,200,await dealers.addBulkPhoto(owner,await orgId(),b.fileName,await fileBytes(b.bytesBase64)));return}
    if(method==='POST'&&path==='/api/bulk/action'){const b=await requestBody(req);json(res,200,await dealers.bulkAction(owner,await orgId(),b.listingIds,b.action,b.value));return}
    if(method==='GET'&&path==='/api/credits'){const id=await orgId();json(res,200,{balance:await dealers.creditBalance(owner,id),packs:dealers.packs(),ledger:await dealers.ledger(owner,id)});return}
    if(method==='POST'&&path==='/api/credits/purchase'){const b=await requestBody(req);json(res,201,await dealers.startPackPurchase(owner,await orgId(),b.packId,b.method));return}
    if(method==='POST'&&path==='/api/demo/pay'){const b=await requestBody(req);json(res,200,await dealers.confirmPackPurchase(system,b.purchaseId,`demo:${b.purchaseId}`));return}
    if(method==='GET'&&path==='/api/leads'){json(res,200,await dealers.leads(owner,await orgId()));return}
    if(method==='POST'&&path==='/api/demo/lead'){const b=await requestBody(req);json(res,201,await dealers.recordLead(system,await orgId(),b.listingId,b.buyerId||'demo-buyer',b.channel));return}
    const lead=/^\/api\/leads\/([a-f0-9-]+)$/.exec(path);
    if(method==='PATCH'&&lead){json(res,200,await dealers.updateLead(owner,await orgId(),lead[1],await requestBody(req)));return}
    if(method==='GET'&&path==='/api/stats'){json(res,200,await dealers.stats(owner,await orgId()));return}
    if(method==='GET'&&path==='/api/stats.csv'){res.writeHead(200,{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="CarBuy-dealer-performance.csv"'});res.end(await dealers.statsCsv(owner,await orgId()));return}
    if(method==='GET'&&path==='/api/notifications'){json(res,200,await dealers.notificationsFor(owner,await orgId()));return}
    if(method==='PATCH'&&path==='/api/profile'){json(res,200,await dealers.updateProfile(owner,await orgId(),await requestBody(req)));return}
    if(method==='PATCH'&&path==='/api/preferences'){json(res,200,await dealers.updatePreferences(owner,await orgId(),await requestBody(req)));return}
    if(method==='POST'&&path==='/api/staff'){json(res,201,await dealers.addMember(owner,await orgId(),await requestBody(req)));return}
    if(method==='POST'&&path==='/api/logo'){
      const b=await requestBody(req),key=await saveLogo(b.bytesBase64);
      json(res,200,await dealers.updateProfile(owner,await orgId(),{logoKey:key}));return;
    }
    if(method==='POST'&&path==='/api/demo/concierge'){const b=await requestBody(req);json(res,201,await dealers.conciergeAdd(admin,await orgId(),b.data));return}
    if(method==='GET'&&path==='/api/audit'){json(res,200,await dealers.auditLog(owner,await orgId()));return}
    if(method==='POST'&&path==='/api/demo/maintenance'){
      const reminders=await listings.expireAndRemind({id:system.id,role:'system'});
      json(res,200,{reminders,renewals:await dealers.autoRenewExpired(system)});return;
    }
    const profile=/^\/dealer\/([a-z0-9-]+)$/.exec(path);
    const profileApi=/^\/api\/dealer\/([a-z0-9-]+)$/.exec(path);
    if(method==='GET'&&profileApi){json(res,200,await dealers.publicProfile(profileApi[1]));return}
    if(method==='GET'&&profile){res.writeHead(200,{'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff'});res.end(await showroomPage(profile[1]));return}
    if(method==='GET'&&path.startsWith('/media/public/')){
      const key=path.slice('/media/public/'.length),bytes=await media.readPublic(key),ext=key.slice(key.lastIndexOf('.'));
      res.writeHead(200,{'content-type':mime[ext]??'application/octet-stream','x-content-type-options':'nosniff'});res.end(bytes);return;
    }
    if(method==='GET'&&['/','/index.html','/app.js','/styles.css'].includes(path)){
      const file=path==='/'?'index.html':path.slice(1),bytes=await readFile(join(root,'web',file));
      res.writeHead(200,{'content-type':mime[file.slice(file.lastIndexOf('.'))],'x-content-type-options':'nosniff'});res.end(bytes);return;
    }
    json(res,404,{error:'Not found'});
  }catch(error){json(res,400,{error:error instanceof Error?error.message:String(error)})}
}).listen(port,'127.0.0.1',()=>console.log(`CarBuy dealer demo: http://127.0.0.1:${port} (local simulation only)`));
