import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DetailError, VehicleDetailService } from './service.ts';
import { renderDetail } from './render.ts';
import type { ActivityStore, Viewer } from './types.ts';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const json=(res:ServerResponse,status:number,value:unknown)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value))};
const idPattern='([a-zA-Z0-9-]{1,80})';
async function body(req:IncomingMessage):Promise<Record<string,unknown>>{
  const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)throw new DetailError(413,'Request too large');chunks.push(chunk)}
  let parsed:unknown;try{parsed=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{throw new DetailError(400,'Invalid JSON')}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new DetailError(400,'Invalid request');return parsed as Record<string,unknown>;
}
type Session={viewer:Viewer;csrf:string};
export class VehicleDetailHttp {
  private readonly sessions=new Map<string,Session>();
  private readonly service:VehicleDetailService;private readonly activity:ActivityStore;private readonly demo:boolean;private readonly publicBase:string;
  constructor(service:VehicleDetailService,activity:ActivityStore,demo:boolean,publicBase:string){
    this.service=service;this.activity=activity;this.demo=demo;this.publicBase=publicBase}
  private session(req:IncomingMessage):Session|undefined{
    const match=/(?:^|;\s*)carbuy_demo_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'');return match?this.sessions.get(match[1]):undefined;
  }
  private requirePost(req:IncomingMessage,url:URL,session?:Session){
    if(req.headers.origin!==url.origin)throw new DetailError(403,'Same-origin request required');
    if(!session)throw new DetailError(401,'Sign in to continue');
    if(req.headers['x-csrf-token']!==session.csrf)throw new DetailError(403,'Invalid request token');
  }
  async handle(req:IncomingMessage,res:ServerResponse,url:URL):Promise<boolean>{
    const path=url.pathname,locale=path.startsWith('/bn/')||url.searchParams.get('lang')==='bn'?'bn':'en';
    const detailRoute=new RegExp(`^/(?:bn/)?car/${idPattern}$`).exec(path);
    const apiRoute=new RegExp(`^/api/detail/${idPattern}(?:/(translate|chassis|contact|report|auction-verification))?$`).exec(path);
    const staticFile=path==='/detail.css'||path==='/detail.js';
    const related=Boolean(detailRoute||apiRoute||staticFile||path==='/api/detail/session'||path.startsWith('/api/demo/'));
    if(!related)return false;
    try{
      if(staticFile&&req.method==='GET'){const bytes=await readFile(join(root,'web',path.slice(1)));
        res.writeHead(200,{'content-type':path.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','x-content-type-options':'nosniff'});res.end(bytes);return true}
      if(path==='/api/detail/session'&&req.method==='GET'){const session=this.session(req);json(res,200,{viewer:session?.viewer??null,csrf:session?.csrf??null,demo:this.demo});return true}
      if(path==='/api/demo/sign-in'&&req.method==='POST'){
        if(!this.demo)throw new DetailError(404,'Demo sign-in disabled');
        if(req.headers.origin!==url.origin)throw new DetailError(403,'Same-origin request required');
        const token=randomBytes(32).toString('hex'),session:Session={viewer:{id:'demo-buyer',phoneVerified:true},csrf:randomBytes(24).toString('hex')};
        this.sessions.set(token,session);res.setHeader('set-cookie',`carbuy_demo_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${url.protocol==='https:'?'; Secure':''}`);
        json(res,200,{viewer:session.viewer,csrf:session.csrf});return true}
      if(path==='/api/demo/sign-out'&&req.method==='POST'){
        const session=this.session(req);this.requirePost(req,url,session);
        const token=/(?:^|;\s*)carbuy_demo_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'')?.[1];if(token)this.sessions.delete(token);
        res.setHeader('set-cookie','carbuy_demo_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');json(res,200,{ok:true});return true}
      if(path==='/api/demo/verification-pay'&&req.method==='POST'){
        if(!this.demo)throw new DetailError(404,'Demo payment disabled');
        const session=this.session(req);this.requirePost(req,url,session);const input=await body(req),id=String(input.orderId??'');
        const order=(await this.activity.read()).orders.find(x=>x.id===id&&x.buyerId===session!.viewer.id);
        if(!order)throw new DetailError(404,'Order not found');
        const result=await this.service.confirmVerificationPayment({role:'system'},id,`demo:${id}`);json(res,200,{id:result.id,status:result.status});return true}
      if(detailRoute&&req.method==='GET'){
        const result=await this.service.publicDetail(detailRoute[1],locale);
        if(result.kind==='redirect'){res.writeHead(302,{location:result.to,'cache-control':'no-store'});res.end();return true}
        const html=renderDetail(result.detail,locale,this.publicBase);
        res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',
          'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'"});res.end(html);return true}
      if(apiRoute){const id=apiRoute[1],action=apiRoute[2];
        if(req.method==='GET'&&!action){const result=await this.service.publicDetail(id,locale);json(res,200,result);return true}
        if(req.method==='GET'&&action==='translate'){
          const to=url.searchParams.get('to');if(to!=='en'&&to!=='bn')throw new DetailError(400,'Choose a translation language');
          json(res,200,await this.service.translate(id,to));return true}
        if(req.method==='POST'&&action){const session=this.session(req);this.requirePost(req,url,session);const viewer=session!.viewer;
          if(action==='chassis'){json(res,200,await this.service.revealChassis(viewer,id));return true}
          if(action==='contact'){const input=await body(req),channel=input.channel;
            if(channel!=='chat'&&channel!=='call'&&channel!=='whatsapp')throw new DetailError(400,'Invalid contact channel');
            json(res,200,await this.service.contact(viewer,id,channel));return true}
          if(action==='report'){const input=await body(req),reason=input.reason,note=input.note??'';
            if(!['suspected_scam','incorrect_details','sold_elsewhere','other'].includes(String(reason))||typeof note!=='string')throw new DetailError(400,'Invalid report');
            json(res,201,await this.service.report(viewer,id,reason as 'suspected_scam'|'incorrect_details'|'sold_elsewhere'|'other',note));return true}
          if(action==='auction-verification'){json(res,201,await this.service.requestAuctionVerification(viewer,id));return true}
        }
      }
      throw new DetailError(405,'Method not allowed');
    }catch(error){const status=error instanceof DetailError?error.status:500;
      if(status===500)console.error(error);
      json(res,status,{error:status===500?'Vehicle detail is unavailable. Please try again.':(error as Error).message});return true}
  }
}
