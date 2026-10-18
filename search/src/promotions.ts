import { readFile } from 'node:fs/promises';
import type { Promotion, PromotionPort } from './types.ts';

// Read-only bridge for a local payment-confirmed promotion feed. The payment
// service owns writes; public search must not accept promotion claims from a
// request or listing draft. Use the SQL promotion table in production.
export class JsonPromotionPort implements PromotionPort {
  private readonly file:string;
  constructor(file:string){this.file=file}
  async active(now:Date):Promise<Promotion[]>{
    let rows:unknown;
    try{rows=JSON.parse(await readFile(this.file,'utf8'))}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error}
    if(!Array.isArray(rows))throw new Error('Promotion feed must be an array');
    return rows.filter((x):x is Promotion=>typeof x==='object'&&x!==null&&
      typeof x.listingId==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(x.listingId)&&
      (x.kind==='top'||x.kind==='featured')&&x.status==='paid'&&
      typeof x.paymentReference==='string'&&x.paymentReference.length>0&&
      typeof x.startsAt==='string'&&typeof x.endsAt==='string'&&
      Date.parse(x.startsAt)<=now.getTime()&&Date.parse(x.endsAt)>now.getTime());
  }
}
