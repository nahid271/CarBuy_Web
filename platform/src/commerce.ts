import { randomUUID } from 'node:crypto';
import { priceHypothesesBdt, type PricedProduct } from '../../shared/pricing.ts';

export type Product=PricedProduct;
export type PaymentMethod='bkash'|'nagad'|'rocket'|'card';
export type Order={id:string;buyerId:string;product:Product;listingId?:string;dealerId?:string;status:'pending'|'paid'|'refund_pending'|'refunded';
  subtotalBdt:number;discountBdt:number;vatBdt:number;totalBdt:number;currency:'BDT';checkoutUrl:string;gatewayReference:string;
  transactionId?:string;method?:PaymentMethod;createdAt:string;paidAt?:string;refundedAt?:string};
// Coupons are reserved at settlement, not at checkout, so abandoned checkouts do not consume them.
export type Coupon={code:string;discountBdt:number;expiresAt:string;maxUses:number;used:number};
export type PaymentGateway={create(order:Pick<Order,'id'|'totalBdt'|'currency'>):Promise<{url:string;reference:string}>;
  verify(order:Order,proof:string):Promise<{transactionId:string;amountBdt:number;currency:string;method:PaymentMethod}|null>;
  refund(order:Order):Promise<{reference:string}|null>};
export type CommerceConfig={pricesBdt:Record<Product,number>;vatRate:number};
export const demoPrices:Record<Product,number>=priceHypothesesBdt;
const creditCount:Partial<Record<Product,number>>={dealer_10:10,dealer_25:25,dealer_50:50,dealer_200:200};
export class CommerceService{
  private readonly gateway:PaymentGateway;
  private readonly config:CommerceConfig;
  private readonly orders:Order[]=[];private readonly coupons=new Map<string,Coupon>();private readonly orderCoupons=new Map<string,string>();
  private readonly creditLedger:Array<{id:string;dealerId:string;delta:number;reason:string;at:string}>=[];
  private readonly sheetQueue:Array<{orderId:string;listingId:string;status:'pending'|'found'|'not_found';partnerReference?:string;grade?:string;mileageKm?:number;auctionDate?:string}>=[];
  private readonly promotions:Array<{listingId:string;kind:'top'|'featured'|'urgent';startsAt:string;endsAt:string;orderId:string}>=[];
  constructor(gateway:PaymentGateway,config:CommerceConfig={pricesBdt:demoPrices,vatRate:0}){
    this.gateway=gateway;this.config=config;
    if(config.vatRate<0||config.vatRate>1)throw new Error('Invalid VAT rate');}
  createCoupon(coupon:Omit<Coupon,'used'>){if(!/^[A-Z0-9_-]{3,30}$/.test(coupon.code)||coupon.discountBdt<0||coupon.maxUses<1)
    throw new Error('Invalid coupon');this.coupons.set(coupon.code,{...coupon,used:0})}
  async createOrder(input:{buyerId:string;product:Product;listingId?:string;dealerId?:string;coupon?:string},now=new Date()){
    if(!input.buyerId||!(input.product in this.config.pricesBdt))throw new Error('Invalid order');
    if((input.product==='private_listing'||input.product.endsWith('_7d')||input.product==='auction_sheet')&&!input.listingId)
      throw new Error('Listing required');
    if(input.product.startsWith('dealer_')&&!input.dealerId)throw new Error('Dealer required');
    const subtotal=this.config.pricesBdt[input.product];if(!Number.isInteger(subtotal)||subtotal<0)throw new Error('Invalid price');
    const coupon=input.coupon?this.coupons.get(input.coupon):undefined;
    if(input.coupon&&(!coupon||coupon.used>=coupon.maxUses||Date.parse(coupon.expiresAt)<=now.getTime()))throw new Error('Coupon unavailable');
    const discount=Math.min(subtotal,coupon?.discountBdt??0),vat=Math.round((subtotal-discount)*this.config.vatRate);
    const order:Order={id:randomUUID(),buyerId:input.buyerId,product:input.product,listingId:input.listingId,dealerId:input.dealerId,
      status:'pending',subtotalBdt:subtotal,discountBdt:discount,vatBdt:vat,totalBdt:subtotal-discount+vat,currency:'BDT',
      checkoutUrl:'',gatewayReference:'',createdAt:now.toISOString()};
    const checkout=await this.gateway.create(order);order.checkoutUrl=checkout.url;order.gatewayReference=checkout.reference;
    this.orders.push(order);if(coupon)this.orderCoupons.set(order.id,coupon.code);return structuredClone(order);
  }
  async settle(orderId:string,proof:string,now=new Date()){
    const order=this.orders.find(x=>x.id===orderId);if(!order)throw new Error('Order not found');
    if(order.status==='paid')return structuredClone(order);
    if(order.status!=='pending')throw new Error('Order cannot be settled');
    const verified=await this.gateway.verify(order,proof);
    if(!verified||!verified.transactionId||verified.amountBdt!==order.totalBdt||verified.currency!=='BDT'||!['bkash','nagad','rocket','card'].includes(verified.method))
      throw new Error('Gateway payment could not be verified');
    const couponCode=this.orderCoupons.get(order.id),coupon=couponCode?this.coupons.get(couponCode):undefined;
    if(coupon&&coupon.used>=coupon.maxUses)throw new Error('Coupon limit reached');
    if(this.orders.some(x=>x.id!==order.id&&x.transactionId===verified.transactionId))throw new Error('Gateway transaction already used');
    order.status='paid';order.transactionId=verified.transactionId;order.method=verified.method;order.paidAt=now.toISOString();
    const count=creditCount[order.product];if(count&&order.dealerId)this.creditLedger.push({id:order.id,dealerId:order.dealerId,delta:count,reason:'paid_pack',at:order.paidAt});
    if(order.product.endsWith('_7d')&&order.listingId)this.promotions.push({listingId:order.listingId,kind:order.product.split('_')[0] as 'top'|'featured'|'urgent',
      startsAt:order.paidAt,endsAt:new Date(now.getTime()+7*86_400_000).toISOString(),orderId:order.id});
    if(order.product==='auction_sheet'&&order.listingId)this.sheetQueue.push({orderId:order.id,listingId:order.listingId,status:'pending'});
    if(coupon)coupon.used++;
    return structuredClone(order);
  }
  async refund(orderId:string,now=new Date()){
    const order=this.orders.find(x=>x.id===orderId);if(!order||!['paid','refund_pending'].includes(order.status))throw new Error('Paid order required');
    order.status='refund_pending';const result=await this.gateway.refund(order);if(!result)return structuredClone(order);
    order.status='refunded';order.refundedAt=now.toISOString();this.promotions.splice(0,this.promotions.length,...this.promotions.filter(x=>x.orderId!==order.id));
    const count=creditCount[order.product];if(count&&order.dealerId)this.creditLedger.push({id:randomUUID(),dealerId:order.dealerId,delta:-count,reason:'refund',at:order.refundedAt});
    return structuredClone(order);
  }
  async completeSheet(orderId:string,result:{found:boolean;partnerReference:string;grade?:string;mileageKm?:number;auctionDate?:string}){
    const task=this.sheetQueue.find(x=>x.orderId===orderId&&x.status==='pending');if(!task)throw new Error('Pending sheet order required');
    if(!result.partnerReference.trim())throw new Error('Partner reference required');
    if(result.found&&(!result.grade||!Number.isInteger(result.mileageKm)||!result.auctionDate))throw new Error('Sheet details required');
    task.status=result.found?'found':'not_found';task.partnerReference=result.partnerReference;
    if(result.found){task.grade=result.grade;task.mileageKm=result.mileageKm;task.auctionDate=result.auctionDate}
    else await this.refund(orderId);
    return structuredClone(task);
  }
  history(buyerId:string){return this.orders.filter(x=>x.buyerId===buyerId).map(x=>structuredClone(x))}
  receipt(buyerId:string,id:string){const row=this.orders.find(x=>x.id===id&&x.buyerId===buyerId&&x.status==='paid');
    if(!row)throw new Error('Receipt not found');return {number:`CB-${row.id}`,date:row.paidAt,subtotalBdt:row.subtotalBdt,
      discountBdt:row.discountBdt,vatBdt:row.vatBdt,totalBdt:row.totalBdt,currency:'BDT',method:row.method,transactionId:row.transactionId}}
  credits(dealerId:string){return this.creditLedger.filter(x=>x.dealerId===dealerId).reduce((sum,x)=>sum+x.delta,0)}
  grantCredits(dealerId:string,count:number,reason:string){if(!dealerId||!Number.isInteger(count)||count<1||count>1000||!reason.trim())throw new Error('Invalid credit grant');
    this.creditLedger.push({id:randomUUID(),dealerId,delta:count,reason,at:new Date().toISOString()});return this.credits(dealerId)}
  activePromotions(now=new Date()){return this.promotions.filter(x=>Date.parse(x.endsAt)>now.getTime()).map(x=>structuredClone(x))}
  sheets(){return this.sheetQueue.map(x=>structuredClone(x))}
}
