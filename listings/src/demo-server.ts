import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogService } from '../../vehicle-data/src/catalog.ts';
import { MemoryCatalogStore } from '../../vehicle-data/src/store.ts';
import { bodyValues, fuelValues, transmissionValues } from '../../vehicle-data/src/values.ts';
import { JsonListingStore } from './store.ts';
import { ListingService } from './service.ts';
import { LocalMediaStore, preparePaper, preparePhoto } from './media.ts';
import { formatBdt, parseBdt } from './price.ts';
import { validateForSubmission } from './validation.ts';
import type { Actor, BillingPort, FeeOrder, Listing } from './types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seller: Actor = { id: 'demo-seller', role: 'seller', phoneVerified: true, sellerType: 'private' };
const moderator: Actor = { id: 'demo-moderator', role: 'moderator' };
const billing: BillingPort = {
  async createCheckout(order: FeeOrder) { return {url:`/demo/checkout?order=${order.id}`,reference:`DEMO-${order.id}`}; },
  async verifyPayment(order: FeeOrder, proof: string) { return proof === `demo:${order.id}`; },
  async refund() { return true; },
};
const catalog = new CatalogService(new MemoryCatalogStore());
const store = new JsonListingStore(join(root, '.local', 'listings.json'));
const media = new LocalMediaStore(join(root, '.local', 'media'));
const service = new ListingService(store, catalog, billing);
const json = (res: import('node:http').ServerResponse, status: number, value: unknown) => {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify(value));
};
async function body(req: import('node:http').IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []; let size=0;
  for await (const chunk of req) { size+=chunk.length; if(size>18*1024*1024) throw new Error('Upload exceeds 18 MB'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
const mime: Record<string,string> = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.avif':'image/avif'};
const port = Number(process.env.PORT ?? 4173);
createServer(async (req,res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const path = url.pathname;
    if (req.method==='GET' && path==='/api/catalog') {
      json(res,200,{catalog:await catalog.snapshot(),values:{body:bodyValues,fuel:fuelValues,transmission:transmissionValues},steps:['chassis','confirm_vehicle','condition_papers','mileage_price','photos','description','location','preview','payment','review']});return;
    }
    if (req.method==='GET' && path==='/api/decode') {json(res,200,await catalog.decode(url.searchParams.get('value')??''));return;}
    if (req.method==='POST' && path==='/api/catalog-request') {const b=await body(req);json(res,200,await catalog.submitUnknown(b.kind,b.text,b.context));return;}
    if (req.method==='GET' && path==='/api/mine') {json(res,200,await service.myListings(seller));return;}
    if (req.method==='POST' && path==='/api/listings') {json(res,201,await service.createDraft(seller));return;}
    const match=/^\/api\/listings\/([a-f0-9-]+)(?:\/(.+))?$/.exec(path);
    if (match) {
      const [,id,action]=match;
      if(req.method==='GET' && !action) {json(res,200,await service.getOwn(seller,id));return;}
      if(req.method==='GET' && action==='validate') {json(res,200,{errors:await validateForSubmission(await service.getOwn(seller,id),catalog)});return;}
      if(req.method==='PATCH' && !action) {const b=await body(req);json(res,200,await service.saveDraft(seller,id,b.patch,b.version));return;}
      if(req.method==='POST' && action==='photo') {
        const b=await body(req);const prepared=await preparePhoto(Buffer.from(b.bytesBase64,'base64'));
        prepared.photo.webpKey=await media.savePublic(prepared.photo.id,'webp',prepared.webp);
        prepared.photo.avifKey=await media.savePublic(prepared.photo.id,'avif',prepared.avif);
        json(res,200,await service.addPhoto(seller,id,prepared.photo));return;
      }
      if(req.method==='POST' && action==='reorder') {const b=await body(req);json(res,200,await service.reorderPhotos(seller,id,b.ids));return;}
      if(req.method==='POST' && action==='remove-photo') {const b=await body(req);json(res,200,await service.removePhoto(seller,id,b.photoId));return;}
      if(req.method==='POST' && action==='paper') {
        const b=await body(req);const prepared=await preparePaper(Buffer.from(b.bytesBase64,'base64'),b.type);
        prepared.paper.privateKey=await media.savePrivate(prepared.paper.id,prepared.extension,prepared.bytes);
        json(res,200,await service.addPaper(seller,id,prepared.paper));return;
      }
      if(req.method==='POST' && action==='auction') {
        const b=await body(req);const prepared=await preparePhoto(Buffer.from(b.bytesBase64,'base64'));
        const displayKey=await media.savePublic(prepared.photo.id,'webp',prepared.webp);
        const privateKey=await media.savePrivate(prepared.photo.id,'webp',prepared.webp);
        json(res,200,await service.setAuctionSheet(seller,id,privateKey,displayKey));return;
      }
      if(req.method==='POST' && action==='submit') {json(res,200,await service.beginSubmission(seller,id));return;}
      if(req.method==='POST' && action==='demo-pay') {
        const listing=await service.getOwn(seller,id);const order=listing.feeOrders.at(-1)!;
        json(res,200,order.kind==='renewal'?await service.confirmRenewal(id,order.id,`demo:${order.id}`):await service.confirmPayment(id,order.id,`demo:${order.id}`));return;
      }
      if(req.method==='POST' && action==='demo-approve') {json(res,200,await service.approve(moderator,id));return;}
      if(req.method==='POST' && action==='demo-reject') {const b=await body(req);json(res,200,await service.reject(moderator,id,b.note??'Please review the details'));return;}
      if(req.method==='POST' && action==='demo-remove') {const b=await body(req);json(res,200,await service.remove(moderator,id,b.note??'Removed by moderator'));return;}
      if(req.method==='POST' && action==='demo-check-papers') {json(res,200,await service.checkPapers(moderator,id));return;}
      if(req.method==='POST' && action==='edit-live') {const b=await body(req);json(res,200,await service.editLive(seller,id,b.patch));return;}
      if(req.method==='POST' && action==='sold') {const b=await body(req);json(res,200,await service.markSold(seller,id,b.soldVia));return;}
      if(req.method==='POST' && action==='relist-sold') {json(res,200,await service.relistSold(seller,id));return;}
      if(req.method==='GET' && action==='vehicle-history') {json(res,200,await service.vehicleHistory(seller,id));return;}
      if(req.method==='POST' && action==='withdraw') {json(res,200,await service.withdraw(seller,id));return;}
      if(req.method==='POST' && action==='relist-withdrawn') {json(res,200,await service.relistWithdrawn(seller,id));return;}
      if(req.method==='POST' && action==='renew') {json(res,200,await service.beginRenewal(seller,id));return;}
      if(req.method==='GET' && action==='share') {json(res,200,service.shareLinks(id,`http://localhost:${port}`));return;}
      if(req.method==='GET' && action==='draft-description') {json(res,200,{text:await service.draftDescription(seller,id,url.searchParams.get('lang')==='bn'?'bn':'en')});return;}
    }
    if(req.method==='GET' && path==='/api/price-guidance') {json(res,200,await service.priceGuidance(url.searchParams.get('makeId')??'',url.searchParams.get('modelId')??'',Number(url.searchParams.get('year'))));return;}
    if(req.method==='GET' && path==='/api/price') {const value=parseBdt(url.searchParams.get('value')??'');json(res,200,{value,formatted:value?formatBdt(value,url.searchParams.get('lang')==='bn'?'bn':'en'):null});return;}
    if(req.method==='GET' && path.startsWith('/media/public/')) {
      const key=path.slice('/media/public/'.length);const bytes=await media.readPublic(key);const ext=key.slice(key.lastIndexOf('.'));
      res.writeHead(200,{'content-type':mime[ext]??'application/octet-stream','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});res.end(bytes);return;
    }
    if(req.method==='GET' && ['/','/index.html','/app.js','/styles.css'].includes(path)) {
      const file=path==='/'?'index.html':path.slice(1);const bytes=await readFile(join(root,'web',file));
      res.writeHead(200,{'content-type':mime[file.slice(file.lastIndexOf('.'))],'x-content-type-options':'nosniff'});res.end(bytes);return;
    }
    json(res,404,{error:'Not found'});
  } catch (error) { json(res,400,{error:error instanceof Error?error.message:String(error)}); }
}).listen(port,'127.0.0.1',()=>{console.log(`CarBuy listings demo: http://127.0.0.1:${port}`);console.log('Local demo identity and payment only. Do not expose this server publicly.');});
