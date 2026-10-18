import type { SearchCard } from '../../search/src/types.ts';

export type Viewer={id:string;phoneVerified:boolean};
export type PrivateSeller={id:string;name:string;memberSince:string;phoneVerified:boolean;responseHours?:number;phone:string;whatsapp?:string};
export type SellerProfilePort={privateSeller(id:string):Promise<PrivateSeller|undefined>};
export type TranslationPort={translate(text:string,to:'en'|'bn'):Promise<string|undefined>};
export type BillingPort={createCheckout(order:VerificationOrder):Promise<{url:string;reference:string}>;verify(order:VerificationOrder,proof:string):Promise<boolean>};
export type DetailPhoto={webpKey:string;avifKey:string;position:number};
export type SellerCard={type:'private';name:string;memberSince:string|null;phoneVerified:boolean;responseHours:number|null}|
  {type:'dealer';name:string;verified:boolean;address:string;hours:string;logoKey:string|null;slug:string};
export type VehicleDetail={
  id:string;availability:'live'|'sold'|'expired';title:string;makeId:string;modelId:string;
  priceBdt:number;priceLakh:number;negotiable:boolean;condition:string;mileageKm:number;engineCc:number;fuel:string;
  manufactureYear:number;registrationYear:number|null;area:string;district:string;colour:string|null;transmission:string;body:string;
  owners:number|null;photos:DetailPhoto[];features:Array<{id:string;name:string;group:string}>;
  description:{text:string;language:'en'|'bn';translationAvailable:boolean};
  trust:{auctionStatus:'none'|'seller_provided_unverified'|'verification_ordered'|'verified';auctionGrade:string|null;
    auctionMileageKm:number|null;mileageMismatch:boolean;papersChecked:boolean;chassisMasked:string;
    taxTokenExpiry:string|null;fitnessExpiry:string|null};
  seller:SellerCard;similar:SearchCard[];priceHistory:Array<{priceBdt:number;at:string}>;daysListed:number;
  runningCost:{engineBand:string;fuel:string;sourceUrl:string};
  publishedAt:string;closedAt:string|null;canContact:boolean;
};
export type DetailOutcome={kind:'detail';detail:VehicleDetail}|{kind:'redirect';to:string};
export type LeadRecord={id:string;listingId:string;buyerId:string;channel:'chat'|'call'|'whatsapp';at:string};
export type RevealRecord={id:string;listingId:string;buyerId:string;at:string};
export type ReportRecord={id:string;listingId:string;buyerId:string;reason:'suspected_scam'|'incorrect_details'|'sold_elsewhere'|'other';note:string;at:string};
export type VerificationOrder={id:string;listingId:string;buyerId:string;amountBdt:number;status:'pending'|'paid';paymentReference?:string;checkoutUrl?:string;createdAt:string;paidAt?:string};
export type ActivityState={leads:LeadRecord[];reveals:RevealRecord[];reports:ReportRecord[];orders:VerificationOrder[]};
export type ActivityStore={read():Promise<ActivityState>;transaction<T>(fn:(state:ActivityState)=>T):Promise<T>};
