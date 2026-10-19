import type { SearchQuery } from '../../search/src/types.ts';

export type SavedCar={buyerId:string;listingId:string;savedAt:string;savedPriceBdt:number};
export type RecentView={buyerId:string;listingId:string;viewedAt:string};
export type SavedAlert={id:string;buyerId:string;path:string;query:SearchQuery;frequency:'instant'|'daily';channels:('push'|'email')[];
  createdAt:string;active:boolean;seenIds:string[];pendingIds:string[];lastDigestDay?:string};
export type AlertDelivery={id:string;alertId:string;buyerId:string;channel:'push'|'email';listingIds:string[];queuedAt:string;status:'queued'};
export type SavedState={cars:SavedCar[];recent:RecentView[];alerts:SavedAlert[];deliveries:AlertDelivery[]};
export type SavedStore={read():Promise<SavedState>;transaction<T>(fn:(state:SavedState)=>T):Promise<T>};
