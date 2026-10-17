import { randomUUID } from 'node:crypto';
import type { BillingPort, FeeOrder, Listing } from '../../listings/src/types.ts';
import type { DealerStore, LedgerEntry } from './types.ts';

export function balance(ledger:readonly LedgerEntry[],orgId:string):number{
  return ledger.filter(x=>x.orgId===orgId).reduce((sum,x)=>sum+x.delta,0);
}
// Dealer listings use one prepaid credit per 30-day term. This adapter plugs
// into ListingService's existing payment handoff, including rejection refunds.
export class DealerCreditBillingPort implements BillingPort {
  private readonly store:DealerStore;
  constructor(store:DealerStore){this.store=store}
  async createCheckout(order:FeeOrder,listing:Listing){
    const state=await this.store.read();
    if(!state.orgs.some(x=>x.id===listing.sellerId))throw new Error('Verified dealer organisation required');
    if(balance(state.ledger,listing.sellerId)<1)throw new Error('No listing credits available; buy a pack');
    await this.registerCheckout(order,listing);
    return {url:`credit://redeem/${order.id}`,reference:`CREDIT-${order.id}`};
  }
  async verifyPayment(order:FeeOrder,proof:string):Promise<boolean>{
    if(proof!==`credit:${order.id}`)return false;
    const state=await this.store.read();
    // The checkout audit binds this listing order to the organisation.
    const reservation=state.audit.find(x=>x.action==='credit_checkout'&&x.detail===order.id);
    const orgId=reservation?.orgId;
    if(!orgId)return false;
    return this.store.transaction(next=>{
      if(next.ledger.some(x=>x.reference===order.id&&(x.reason==='listing'||x.reason==='renewal')))return true;
      if(balance(next.ledger,orgId)<1)return false;
      next.ledger.push({id:randomUUID(),orgId,delta:-1,reason:order.kind==='renewal'?'renewal':'listing',reference:order.id,createdAt:new Date().toISOString()});
      return true;
    });
  }
  async refund(order:FeeOrder):Promise<boolean>{
    return this.store.transaction(state=>{
      const debit=state.ledger.find(x=>x.reference===order.id&&x.delta===-1);
      if(!debit)return false;
      if(state.ledger.some(x=>x.reference===order.id&&x.reason==='refund'))return true;
      state.ledger.push({id:randomUUID(),orgId:debit.orgId,delta:1,reason:'refund',reference:order.id,createdAt:new Date().toISOString()});
      return true;
    });
  }
  async registerCheckout(order:FeeOrder,listing:Listing):Promise<void>{
    await this.store.transaction(state=>{if(!state.audit.some(x=>x.action==='credit_checkout'&&x.detail===order.id))
      state.audit.push({id:randomUUID(),orgId:listing.sellerId,actorId:'system',action:'credit_checkout',detail:order.id,createdAt:new Date().toISOString()});});
  }
}
