import type { CatalogSnapshot } from '../../vehicle-data/src/types.ts';
import { bodyValues, fuelValues, transmissionValues } from '../../vehicle-data/src/values.ts';
import type { SearchQuery, SearchSort } from './types.ts';
import { findDistrict, findDivision } from './locations.ts';

export type SearchRoute={kind:'home'|'search';locale:'en'|'bn';makeId?:string;modelId?:string;district?:string};
const sortValues=new Set<SearchSort>(['best_match','newest','price_asc','price_desc','mileage_asc','year_desc']);
const conditions=new Set(['used','reconditioned']);const sellerTypes=new Set(['private','dealer']);
function num(params:URLSearchParams,key:string,min:number,max:number):number|undefined{
  const raw=params.get(key);if(raw===null||raw==='')return undefined;
  const value=Number(raw);if(!Number.isFinite(value)||value<min||value>max)throw new Error(`Invalid ${key}`);return value;
}
function choice(params:URLSearchParams,key:string,allowed:Set<string>):string|undefined{
  const value=params.get(key);if(value===null||value==='')return undefined;
  if(!allowed.has(value))throw new Error(`Invalid ${key}`);return value;
}
function flag(params:URLSearchParams,key:string):boolean|undefined{
  const value=params.get(key);if(value===null||value==='')return undefined;
  if(value!=='1'&&value!=='0')throw new Error(`Invalid ${key}`);return value==='1';
}
function text(params:URLSearchParams,key:string,max:number):string|undefined{
  const value=params.get(key)?.normalize('NFKC').trim();if(!value)return undefined;
  if(value.length>max)throw new Error(`${key} is too long`);return value;
}
function range(q:SearchQuery,low:keyof SearchQuery,high:keyof SearchQuery){
  const a=q[low],b=q[high];if(typeof a==='number'&&typeof b==='number'&&a>b)throw new Error(`${String(low)} must not exceed ${String(high)}`);
}
export function resolveRoute(pathname:string,catalog:CatalogSnapshot):SearchRoute|null{
  const path=pathname.replace(/\/+$/,'')||'/';if(path==='/')return {kind:'home',locale:'en'};
  if(path==='/bn')return {kind:'home',locale:'bn'};
  const parts=path.split('/').filter(Boolean).map(x=>{try{return decodeURIComponent(x)}catch{return ''}});
  const locale=parts[0]==='bn'?'bn':'en';if(locale==='bn')parts.shift();
  if(parts[0]!=='cars')return null;
  if(parts.length===1)return {kind:'search',locale};
  if(parts.length===2){const district=findDistrict(parts[1]);return district?{kind:'search',locale,district:district.id}:null}
  if(parts.length===3){const make=catalog.makes.find(x=>x.id===parts[1]&&x.active);
    const model=catalog.models.find(x=>x.id===parts[2]&&x.makeId===make?.id&&x.active);
    return make&&model?{kind:'search',locale,makeId:make.id,modelId:model.id}:null}
  return null;
}
export function parseSearchQuery(params:URLSearchParams,route:SearchRoute,catalog:CatalogSnapshot,now=new Date()):SearchQuery{
  const currentYear=now.getUTCFullYear();
  const rawModels=params.getAll('model').flatMap(x=>x.split(',')).map(x=>x.trim()).filter(Boolean);
  const modelIds=[...new Set(rawModels)];if(modelIds.length>10)throw new Error('Choose up to 10 models');
  const makeId=route.makeId??text(params,'make',60);
  if(makeId&&!catalog.makes.some(x=>x.id===makeId&&x.active))throw new Error('Unknown make');
  if(route.modelId){modelIds.length=0;modelIds.push(route.modelId)}
  if(modelIds.some(id=>!catalog.models.some(x=>x.id===id&&x.active&&(!makeId||x.makeId===makeId))))throw new Error('Unknown model for selected make');
  const gradeId=text(params,'grade',80);
  if(gradeId&&gradeId!=='not-listed'&&!catalog.grades.some(x=>x.id===gradeId&&x.active))throw new Error('Unknown grade');
  const divisionValue=text(params,'division',80),districtValue=route.district??text(params,'district',80);
  const division=divisionValue?findDivision(divisionValue)?.id:undefined;
  const district=districtValue?findDistrict(districtValue)?.id:undefined;
  if(divisionValue&&!division)throw new Error('Unknown division');
  if(districtValue&&!district)throw new Error('Unknown district');
  const districtInfo=district?findDistrict(district):undefined;
  if(division&&districtInfo&&districtInfo.divisionId!==division)throw new Error('District is outside selected division');
  const area=text(params,'area',80);if(area&&!district)throw new Error('Choose a district before an area');
  const sort=choice(params,'sort',sortValues) as SearchSort|undefined;
  const page=num(params,'page',1,10000)??1;if(!Number.isInteger(page))throw new Error('Invalid page');
  const q:SearchQuery={locale:route.locale,sort:sort??'best_match',page,
    keyword:text(params,'q',120),condition:choice(params,'condition',conditions) as SearchQuery['condition'],
    makeId,modelIds:modelIds.length?modelIds:undefined,gradeId,
    minPriceLakh:num(params,'priceMin',0,100000),maxPriceLakh:num(params,'priceMax',0,100000),
    minYear:num(params,'yearMin',1950,currentYear+1),maxYear:num(params,'yearMax',1950,currentYear+1),
    minRegistrationYear:num(params,'regMin',1950,currentYear+1),maxRegistrationYear:num(params,'regMax',1950,currentYear+1),
    minMileageKm:num(params,'mileageMin',0,2000000),maxMileageKm:num(params,'mileageMax',0,2000000),
    minEngineCc:num(params,'ccMin',1,20000),maxEngineCc:num(params,'ccMax',1,20000),
    fuel:choice(params,'fuel',new Set(Object.keys(fuelValues))) as SearchQuery['fuel'],
    body:choice(params,'body',new Set(Object.keys(bodyValues))) as SearchQuery['body'],
    transmission:choice(params,'transmission',new Set(Object.keys(transmissionValues))) as SearchQuery['transmission'],
    colour:text(params,'colour',60),sellerType:choice(params,'seller',sellerTypes) as SearchQuery['sellerType'],
    division,district,area,
    auctionVerified:flag(params,'auctionVerified'),papersChecked:flag(params,'papersChecked'),verifiedDealer:flag(params,'verifiedDealer'),
    minAuctionGrade:num(params,'minAuctionGrade',0,6),
  };
  for(const [low,high] of [['minPriceLakh','maxPriceLakh'],['minYear','maxYear'],['minRegistrationYear','maxRegistrationYear'],
    ['minMileageKm','maxMileageKm'],['minEngineCc','maxEngineCc']] as Array<[keyof SearchQuery,keyof SearchQuery]>)range(q,low,high);
  return q;
}
