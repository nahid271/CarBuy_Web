import type { Body, Fuel, Transmission } from '../../vehicle-data/src/types.ts';
import type { Condition, SellerType } from '../../listings/src/types.ts';

export type SearchSort = 'best_match'|'newest'|'price_asc'|'price_desc'|'mileage_asc'|'year_desc';
export type SearchQuery = {
  keyword?:string;condition?:Condition;makeId?:string;modelIds?:string[];gradeId?:string;
  minPriceLakh?:number;maxPriceLakh?:number;minYear?:number;maxYear?:number;
  minRegistrationYear?:number;maxRegistrationYear?:number;minMileageKm?:number;maxMileageKm?:number;
  minEngineCc?:number;maxEngineCc?:number;fuel?:Fuel;body?:Body;transmission?:Transmission;
  colour?:string;sellerType?:SellerType;division?:string;district?:string;area?:string;
  auctionVerified?:boolean;papersChecked?:boolean;verifiedDealer?:boolean;minAuctionGrade?:number;
  sort:SearchSort;page:number;locale:'en'|'bn';
};
export type Promotion={listingId:string;kind:'top'|'featured';status:'paid'|'pending'|'cancelled';
  paymentReference:string;startsAt:string;endsAt:string};
export type PromotionPort={active(now:Date):Promise<Promotion[]>};
export type SearchCard={
  id:string;title:string;makeId:string;modelId:string;gradeId?:string;year:number;priceBdt:number;priceLakh:number;
  condition:Condition;mileageKm:number;engineCc:number;fuel:Fuel;body:Body;transmission:Transmission;
  colour?:string;district:string;division?:string;area:string;sellerType:SellerType;
  coverKey?:string;auctionVerified:boolean;papersChecked:boolean;verifiedDealer:boolean;auctionGrade?:number;
  placement?:'top'|'featured';publishedAt:string;score:number;
};
export type FacetOption={id:string;label:string;count:number};
export type SearchFacets=Record<'condition'|'make'|'model'|'grade'|'fuel'|'body'|'transmission'|'sellerType'|'division'|'district'|'area'|'colour'|'trust',FacetOption[]>;
export type SearchResult={query:SearchQuery;total:number;page:number;pageSize:24;totalPages:number;cards:SearchCard[];
  facets:SearchFacets;suggestions:string[];nextCursor:string|null};
