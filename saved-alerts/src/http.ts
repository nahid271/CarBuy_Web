import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { SavedError, SavedService } from './service.ts';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const json=(res:ServerResponse,status:number,value:unknown)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value))};
async function body(req:IncomingMessage){const chunks:Buffer[]=[];let size=0;for await(const part of req){size+=part.length;
  if(size>4096)throw new SavedError(413,'Request too large');chunks.push(part)}
  let value:unknown;try{value=JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{throw new SavedError(400,'Invalid JSON')}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new SavedError(400,'Invalid request');return value as Record<string,unknown>}
type Identity={viewer:{id:string;phoneVerified:boolean};csrf:string};
export class SavedHttp{
  private readonly service:SavedService;private readonly identity:(req:IncomingMessage)=>Identity|undefined;
  constructor(service:SavedService,identity:(req:IncomingMessage)=>Identity|undefined){this.service=service;this.identity=identity}
  async handle(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
    const path=url.pathname,locale=path.startsWith('/bn/')||url.searchParams.get('locale')==='bn'?'bn':'en';
    if(!(/^\/(?:bn\/)?saved$/.test(path)||path==='/saved.css'||path==='/saved.js'||path.startsWith('/api/saved/')))return false;
    try{
      if(path==='/saved.css'||path==='/saved.js'){
        if(req.method!=='GET')throw new SavedError(405,'Method not allowed');
        const bytes=await readFile(join(root,'web',path.slice(1)));res.writeHead(200,{'content-type':path.endsWith('css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8',
          'x-content-type-options':'nosniff'});res.end(bytes);return true}
      if(/^\/(?:bn\/)?saved$/.test(path)){
        if(req.method!=='GET')throw new SavedError(405,'Method not allowed');
        const html=(await readFile(join(root,'web','index.html'),'utf8')).replaceAll('__LANG__',locale);
        res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',
          'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'"});res.end(html);return true}
      const identity=this.identity(req);if(!identity)throw new SavedError(401,'Sign in to continue');
      if(!identity.viewer.phoneVerified)throw new SavedError(403,'Phone verification required');
      if(req.method!=='GET'){
        if(req.headers.origin!==url.origin)throw new SavedError(403,'Same-origin request required');
        if(req.headers['x-csrf-token']!==identity.csrf)throw new SavedError(403,'Invalid request token')}
      const buyer=identity.viewer.id;
      if(path==='/api/saved/cars'&&req.method==='GET'){json(res,200,await this.service.cars(buyer,locale));return true}
      const car=/^\/api\/saved\/cars\/([a-zA-Z0-9-]{1,80})$/.exec(path);
      if(car&&req.method==='POST'){json(res,201,await this.service.saveCar(buyer,car[1]));return true}
      if(car&&req.method==='DELETE'){json(res,200,await this.service.removeCar(buyer,car[1]));return true}
      if(path==='/api/saved/recent'&&req.method==='GET'){json(res,200,await this.service.recent(buyer,locale));return true}
      if(path==='/api/saved/recent/sync'&&req.method==='POST'){
        const input=await body(req);if(!Array.isArray(input.ids)||input.ids.some(x=>typeof x!=='string'))throw new SavedError(400,'Invalid recent cars');
        json(res,200,await this.service.syncRecent(buyer,input.ids as string[]));return true}
      const recent=/^\/api\/saved\/recent\/([a-zA-Z0-9-]{1,80})$/.exec(path);
      if(recent&&req.method==='POST'){json(res,200,await this.service.view(buyer,recent[1]));return true}
      if(path==='/api/saved/alerts'&&req.method==='GET'){json(res,200,await this.service.alerts(buyer));return true}
      if(path==='/api/saved/alerts'&&req.method==='POST'){
        const input=await body(req);json(res,201,await this.service.createAlert(buyer,{path:input.path as string,
          frequency:input.frequency as string,channels:input.channels as string[]}));return true}
      const alert=/^\/api\/saved\/alerts\/([a-f0-9-]{36})$/.exec(path);
      if(alert&&req.method==='DELETE'){json(res,200,await this.service.unsubscribe(buyer,alert[1]));return true}
      if(path==='/api/saved/deliveries'&&req.method==='GET'){json(res,200,await this.service.deliveries(buyer));return true}
      throw new SavedError(405,'Method not allowed');
    }catch(error){const status=error instanceof SavedError?error.status:500;if(status===500)console.error(error);
      json(res,status,{error:status===500?'Saved items are unavailable. Please try again.':(error as Error).message});return true}
  }
}
