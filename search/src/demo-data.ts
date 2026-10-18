import { CatalogService } from '../../vehicle-data/src/catalog.ts';
import { MemoryCatalogStore } from '../../vehicle-data/src/store.ts';
import { MemoryListingStore } from '../../listings/src/store.ts';
import { MemoryDealerStore } from '../../dealers/src/store.ts';
import type { Listing, ListingData } from '../../listings/src/types.ts';
import type { Promotion } from './types.ts';

export const demoCatalog=new CatalogService(new MemoryCatalogStore());
export const demoListings=new MemoryListingStore();
export const demoDealers=new MemoryDealerStore();
export const demoPromotions:Promotion[]=[];

export async function seedDemo(now=new Date()):Promise<void>{
  const catalog=await demoCatalog.snapshot();
  const districts=['Dhaka','Dhaka','Chattogram','Gazipur','Sylhet','Rajshahi','Khulna','Cumilla'];
  const areas=['Dhanmondi','Uttara','Agrabad','Tongi','Zindabazar','Shaheb Bazar','Sonadanga','Kandirpar'];
  const colours=['Pearl White','Silver','Midnight Black','Blue','Red','Grey'];
  const models=['axio','noah','vezel','fielder','xtrail','aqua','harrier','allion','voxy','premio','grace','prado','chr','corolla'];
  const cars:Listing[]=[];
  for(let i=0;i<48;i++){
    const modelId=models[i%models.length];
    const model=catalog.models.find(x=>x.id===modelId)!;
    const generation=catalog.generations.find(x=>x.modelId===modelId)!;
    const grade=catalog.grades.find(x=>x.generationId===generation.id)!;
    const isDealer=i%3!==0;
    const location=i%districts.length;
    const data:Partial<ListingData>={makeId:model.makeId,modelId,generationId:generation.id,gradeId:grade.id,
      manufactureYear:2017+i%9,registrationYear:2019+i%7,mileageKm:18000+(i*7613)%90000,
      engineCc:generation.specs.engineCc??1500,fuel:generation.specs.fuel,body:generation.specs.body,
      transmission:generation.specs.transmission,condition:i%4===0?'used':'reconditioned',
      priceBdt:(13+(i*7)%52)*100000+((i%3)*50000),district:districts[location],area:areas[location],
      colour:colours[i%colours.length],description:'Well maintained vehicle with service records available for inspection.',
      featureIds:['reverse_camera','airbags'],chassisNumber:`DEMO-PRIVATE-${i+1}`,registrationNumber:`DEMO-${i+1}`};
    const publishedAt=new Date(now.getTime()-(i+1)*5*3600_000).toISOString();
    cars.push({id:`demo-car-${String(i+1).padStart(3,'0')}`,sellerId:isDealer?'demo-dealer':'demo-private',sellerType:isDealer?'dealer':'private',
      status:'live',version:1,data,photos:[{id:`photo-${i}`,position:0,webpKey:`demo-${modelId}-${i%6}.svg`,avifKey:`demo-${modelId}-${i%6}.svg`,
        sha256:'demo',width:1200,height:800,hints:[]}],papers:[],
      auctionSheet:i%4===0?{privateKey:'private-demo',displayKey:'demo-sheet',status:'verified',grade:i%8===0?'4.5':'4'}:undefined,
      papersChecked:i%5===0,metrics:{impressions:0,views:0,chat:0,call:0,whatsapp:0,saves:0},priceHistory:[],feeOrders:[],
      createdAt:publishedAt,updatedAt:publishedAt,publishedAt,expiresAt:new Date(now.getTime()+31*86_400_000).toISOString(),reminderDaysSent:[]});
  }
  await demoListings.transaction(state=>{state.listings=cars});
  await demoDealers.transaction(state=>{state.orgs=[{id:'demo-dealer',slug:'city-motors-demo',name:'City Motors Demo',address:'Dhaka',district:'Dhaka',
    phones:[],whatsapp:'',logoKey:'',hours:'',about:'Demo showroom',verifiedAt:now.toISOString(),verificationMethod:'visit',members:[],
    autoRenew:false,createdAt:now.toISOString()}]});
  demoPromotions.push(
    {listingId:'demo-car-001',kind:'top',status:'paid',paymentReference:'DEMO-PAID-1',startsAt:new Date(now.getTime()-1000).toISOString(),endsAt:new Date(now.getTime()+7*86_400_000).toISOString()},
    {listingId:'demo-car-002',kind:'featured',status:'paid',paymentReference:'DEMO-PAID-2',startsAt:new Date(now.getTime()-1000).toISOString(),endsAt:new Date(now.getTime()+7*86_400_000).toISOString()},
    {listingId:'demo-car-003',kind:'featured',status:'paid',paymentReference:'DEMO-PAID-3',startsAt:new Date(now.getTime()-1000).toISOString(),endsAt:new Date(now.getTime()+7*86_400_000).toISOString()},
    {listingId:'demo-car-004',kind:'top',status:'pending',paymentReference:'',startsAt:new Date(now.getTime()-1000).toISOString(),endsAt:new Date(now.getTime()+7*86_400_000).toISOString()},
  );
}
