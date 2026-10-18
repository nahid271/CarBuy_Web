import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage,ServerResponse } from 'node:http';
import type { Participant } from './types.ts';
import { MessageError,MessagingService } from './service.ts';
import { LocalChatImages } from './attachments.ts';
import { renderMessaging } from './render.ts';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const json=(res:ServerResponse,status:number,value:unknown)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value))};
async function body(req:IncomingMessage,max=12_000):Promise<Record<string,unknown>>{
  const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw new MessageError(413,'Request too large');chunks.push(chunk)}
  let value:unknown;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{throw new MessageError(400,'Invalid JSON')}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new MessageError(400,'Invalid request');return value as Record<string,unknown>;
}
type Session={participant:Participant;csrf:string};
export class MessagingHttp{
  private readonly sellers=new Map<string,Session>();
  private readonly service:MessagingService;private readonly images:LocalChatImages;
  private readonly buyerIdentity:(req:IncomingMessage)=>{viewer:{id:string;phoneVerified:boolean};csrf:string}|undefined;
  private readonly demo:boolean;
  constructor(service:MessagingService,images:LocalChatImages,
    buyerIdentity:(req:IncomingMessage)=>{viewer:{id:string;phoneVerified:boolean};csrf:string}|undefined,demo:boolean){
      this.service=service;this.images=images;this.buyerIdentity=buyerIdentity;this.demo=demo}
  private sellerSession(req:IncomingMessage):Session|undefined{
    const token=/(?:^|;\s*)carbuy_demo_seller=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'')?.[1];
    return token?this.sellers.get(token):undefined;
  }
  private identity(req:IncomingMessage,url:URL):Session|undefined{
    if(url.searchParams.get('as')==='seller')return this.sellerSession(req);
    const buyer=this.buyerIdentity(req);
    return buyer?{participant:{id:buyer.viewer.id,role:'buyer',phoneVerified:buyer.viewer.phoneVerified},csrf:buyer.csrf}:
      this.sellerSession(req);
  }
  private authenticated(req:IncomingMessage,url:URL):Session{
    const session=this.identity(req,url);if(!session)throw new MessageError(401,'Sign in to continue');return session;
  }
  private post(req:IncomingMessage,url:URL,session:Session){
    if(req.headers.origin!==url.origin)throw new MessageError(403,'Same-origin request required');
    if(req.headers['x-csrf-token']!==session.csrf)throw new MessageError(403,'Invalid request token');
  }
  async handle(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
    const path=url.pathname,thread=/^\/(?:bn\/)?chat\/([a-f0-9-]{36})$/.exec(path),
      apiThread=/^\/api\/messaging\/conversations\/([a-f0-9-]{36})(?:\/(messages|events|block|report|images|image\/([a-f0-9-]{36})))?$/.exec(path);
    const related=path==='/inbox'||path==='/seller-inbox'||path==='/bn/inbox'||path==='/bn/seller-inbox'||
      Boolean(thread||apiThread)||path.startsWith('/api/messaging/')||path==='/messaging.css'||path==='/messaging.js';
    if(!related)return false;
    try{
      if((path==='/messaging.css'||path==='/messaging.js')&&req.method==='GET'){
        const bytes=await readFile(join(root,'web',path.slice(1)));res.writeHead(200,{'content-type':path.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8',
          'x-content-type-options':'nosniff'});res.end(bytes);return true}
      if(['/inbox','/seller-inbox','/bn/inbox','/bn/seller-inbox'].includes(path)&&req.method==='GET'){
        const locale=path.startsWith('/bn/')?'bn':'en',seller=path.includes('seller-inbox');
        const html=renderMessaging({locale,seller,threadId:null});res.writeHead(200,{'content-type':'text/html; charset=utf-8',
          'cache-control':'no-store','content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'"});res.end(html);return true}
      if(thread&&req.method==='GET'){
        const html=renderMessaging({locale:path.startsWith('/bn/')?'bn':'en',seller:url.searchParams.get('as')==='seller',threadId:thread[1]});
        res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store',
          'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'"});res.end(html);return true}
      if(path==='/api/messaging/session'&&req.method==='GET'){
        const session=this.identity(req,url);json(res,200,{participant:session?.participant??null,csrf:session?.csrf??null,demo:this.demo});return true}
      if(path==='/api/messaging/demo/seller-sign-in'&&req.method==='POST'){
        if(!this.demo)throw new MessageError(404,'Demo seller sign-in disabled');
        if(req.headers.origin!==url.origin)throw new MessageError(403,'Same-origin request required');
        const input=await body(req),id=input.sellerId;
        if(id!=='demo-private'&&id!=='demo-dealer')throw new MessageError(400,'Choose a demo seller');
        const token=randomBytes(32).toString('hex'),session:Session={participant:{id,role:'seller',phoneVerified:true},csrf:randomBytes(24).toString('hex')};
        this.sellers.set(token,session);res.setHeader('set-cookie',`carbuy_demo_seller=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${url.protocol==='https:'?'; Secure':''}`);
        json(res,200,{participant:session.participant,csrf:session.csrf});return true}
      if(path==='/api/messaging/conversations'&&req.method==='GET'){
        const session=this.authenticated(req,url);json(res,200,await this.service.inbox(session.participant));return true}
      if(path==='/api/messaging/leads'&&req.method==='GET'){
        const session=this.authenticated(req,url);json(res,200,await this.service.leads(session.participant));return true}
      if(path==='/api/messaging/open'&&req.method==='POST'){
        const session=this.authenticated(req,url);this.post(req,url,session);const input=await body(req);
        if(typeof input.listingId!=='string'||input.listingId.length>80||input.trap)throw new MessageError(400,'Invalid car');
        const result=await this.service.open(session.participant,input.listingId,String(input.botProof??''));json(res,201,result);return true}
      if(apiThread){const id=apiThread[1],action=apiThread[2],session=this.authenticated(req,url),actor=session.participant;
        if(req.method==='GET'&&!action){json(res,200,await this.service.thread(actor,id));return true}
        if(req.method==='GET'&&action==='events'){
          await this.service.thread(actor,id);
          res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store','connection':'keep-alive','x-content-type-options':'nosniff'});
          res.write(': connected\n\n');
          const unsubscribe=await this.service.subscribe(id,actor,()=>res.write('event: update\ndata: {}\n\n'));
          const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),25_000);
          req.on('close',()=>{clearInterval(heartbeat);unsubscribe()});return true}
        if(req.method==='GET'&&action?.startsWith('image/')){
          const attachment=await this.service.attachment(actor,id,apiThread[3]);const bytes=await this.images.read(attachment.privateKey);
          res.writeHead(200,{'content-type':'image/webp','cache-control':'private,no-store','x-content-type-options':'nosniff'});res.end(bytes);return true}
        if(req.method==='POST'){this.post(req,url,session);
          if(action==='messages'){const input=await body(req);if(input.trap||typeof input.text!=='string')throw new MessageError(400,'Invalid message');
            json(res,201,await this.service.send(actor,id,input.text,String(input.botProof??'')));return true}
          if(action==='images'){const input=await body(req,9_000_000);
            if(input.trap||typeof input.bytesBase64!=='string'||input.bytesBase64.length>8_400_000||!/^[-A-Za-z0-9+/=]+$/.test(input.bytesBase64))
              throw new MessageError(400,'Invalid image');
            await this.service.authorizeImage(actor,id);
            const bytes=Buffer.from(input.bytesBase64,'base64');let key:string;
            try{key=await this.images.save(bytes)}catch{throw new MessageError(400,'Use a clear JPEG, PNG, WebP or AVIF photo under 6 MB')}
            const registered=await this.service.registerImage(actor,id,key),message=await this.service.image(actor,id,registered.id);
            json(res,201,message);return true}
          if(action==='block'){json(res,200,await this.service.block(actor,id));return true}
          if(action==='report'){const input=await body(req);if(typeof input.note!=='string'||typeof input.reason!=='string')throw new MessageError(400,'Invalid report');
            json(res,201,await this.service.report(actor,id,input.reason as 'scam'|'abuse'|'spam'|'other',input.note));return true}
        }
      }
      throw new MessageError(405,'Method not allowed');
    }catch(error){const status=error instanceof MessageError?error.status:500;if(status===500)console.error(error);
      json(res,status,{error:status===500?'Messaging is unavailable. Please try again.':(error as Error).message});return true}
  }
}
