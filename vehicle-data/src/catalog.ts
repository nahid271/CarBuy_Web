import { randomUUID } from 'node:crypto';
import type { AdminActor, CatalogSnapshot, CatalogStore, DecodeCandidate, DecodeResult, Feature, Generation, Grade, LicensedCatalogProvider, Make, MappingRequest, Model } from './types.ts';
import { chassisFormat } from './validation.ts';
import { bodyValues, driveValues, fuelValues, transmissionValues } from './values.ts';

const clone = <T>(x: T): T => structuredClone(x);
const hasName = (name: {en:string;bn:string}) => name.en.trim().length > 0 && name.bn.trim().length > 0;
const codePattern = /^[A-Z0-9]{2,12}$/;
function requireAdmin(actor: AdminActor) {
  if (actor.role !== 'vehicle_catalog_admin' || !actor.id) throw new Error('Vehicle catalogue admin role required');
}
function assertUnique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} ID`);
}
export function validateCatalog(c: CatalogSnapshot): void {
  assertUnique(c.makes.map(x=>x.id),'make');
  assertUnique(c.models.map(x=>x.id),'model');
  assertUnique(c.generations.map(x=>x.id),'generation');
  assertUnique(c.grades.map(x=>x.id),'grade');
  assertUnique(c.features.map(x=>x.id),'feature');
  for (const x of [...c.makes,...c.models,...c.generations,...c.grades,...c.features]) {
    if (!hasName(x.name)) throw new Error(`English and Bangla names required for ${x.id}`);
  }
  for (const x of c.models) if (!c.makes.some(y=>y.id===x.makeId)) throw new Error(`Unknown make for ${x.id}`);
  for (const x of c.generations) {
    if (!c.models.some(y=>y.id===x.modelId)) throw new Error(`Unknown model for ${x.id}`);
    if (!Number.isInteger(x.specs.seats) || x.specs.seats < 1 || x.specs.seats > 20) throw new Error(`Invalid seats for ${x.id}`);
    if (x.specs.engineCc !== null && (!Number.isInteger(x.specs.engineCc) || x.specs.engineCc < 1)) throw new Error(`Invalid engine cc for ${x.id}`);
    if (!(x.specs.body in bodyValues) || !(x.specs.fuel in fuelValues)
      || !(x.specs.drive in driveValues) || !(x.specs.transmission in transmissionValues)) throw new Error(`Invalid specification value for ${x.id}`);
    for (const m of x.chassis) {
      if (!codePattern.test(m.code) || !m.sourceUrl) throw new Error(`Invalid chassis mapping in ${x.id}`);
    }
  }
  for (const x of c.grades) if (!c.generations.some(y=>y.id===x.generationId)) throw new Error(`Unknown generation for ${x.id}`);
}

export class CatalogService {
  private readonly store: CatalogStore;
  constructor(store: CatalogStore) { this.store=store; }
  async snapshot() { const data=await this.store.load();validateCatalog(data);return clone(data); }
  async makes() { return (await this.snapshot()).makes.filter(x=>x.active); }
  async models(makeId?: string) { return (await this.snapshot()).models.filter(x=>x.active && (!makeId || x.makeId===makeId)); }
  async generations(modelId?: string) { return (await this.snapshot()).generations.filter(x=>x.active && (!modelId || x.modelId===modelId)); }
  async grades(generationId?: string) { return (await this.snapshot()).grades.filter(x=>x.active && (!generationId || x.generationId===generationId)); }
  async gradeOptions(generationId:string) {
    const grades=await this.grades(generationId);
    return [...grades,{id:'not-listed',generationId,name:{en:'Not listed — enter grade',bn:'তালিকায় নেই — গ্রেড লিখুন'},active:true}];
  }
  async features() { return (await this.snapshot()).features.filter(x=>x.active); }
  async decode(input: string): Promise<DecodeResult> {
    const parsed=chassisFormat(input);
    if (!parsed.valid) return {status:'invalid',reason:parsed.reason};
    if (parsed.kind==='vin') return {status:'vin',normalized:parsed.normalized,candidates:[],gradeConfirmationRequired:true};
    const c=await this.snapshot();
    const candidates:DecodeCandidate[]=[];
    for (const generation of c.generations.filter(x=>x.active)) {
      const mapping=generation.chassis.find(x=>x.code===parsed.code);
      if (!mapping) continue;
      const model=c.models.find(x=>x.id===generation.modelId && x.active);
      const make=model && c.makes.find(x=>x.id===model.makeId && x.active);
      if (!model || !make) continue;
      candidates.push({make,model,generation,engineCc:generation.specs.engineCc,
        engineCode:mapping.engineCode,grades:c.grades.filter(x=>x.generationId===generation.id && x.active),
        evidenceUrl:mapping.sourceUrl});
    }
    if (!candidates.length) return {status:'unknown',normalized:parsed.normalized,chassisCode:parsed.code!,candidates:[],gradeConfirmationRequired:true};
    return {status:candidates.length===1?'matched':'ambiguous',normalized:parsed.normalized,
      chassisCode:parsed.code!,candidates,gradeConfirmationRequired:true};
  }
  async submitUnknown(kind: MappingRequest['kind'], submittedText: string, context: MappingRequest['context']={}) {
    if (!['make','model','generation','grade','chassis'].includes(kind)) throw new Error('Invalid mapping request kind');
    const text=submittedText.normalize('NFKC').trim();
    if (text.length<2 || text.length>120) throw new Error('Enter 2–120 characters');
    for (let attempt=0;attempt<3;attempt++) {
      const c=await this.snapshot();
      const existing=c.mappingRequests.find(x=>x.status==='open' && x.kind===kind
        && x.submittedText.toLocaleLowerCase()===text.toLocaleLowerCase()
        && JSON.stringify(x.context)===JSON.stringify(context));
      if (existing) return existing;
      const request:MappingRequest={id:randomUUID(),kind,submittedText:text,context,status:'open',createdAt:new Date().toISOString()};
      c.mappingRequests.push(request);
      try { await this.store.save({...c,version:c.version+1},c.version);return request; }
      catch(e) { if (String(e).includes('version conflict')) continue;throw e; }
    }
    throw new Error('Could not save mapping request; retry');
  }
  async mappingRequests(actor:AdminActor) {requireAdmin(actor);return (await this.snapshot()).mappingRequests;}
  async resolveRequest(actor:AdminActor,id:string,status:'mapped'|'rejected',mappedTo?:string) {
    requireAdmin(actor);
    return this.mutate(c=>{
      const r=c.mappingRequests.find(x=>x.id===id);
      if (!r || r.status!=='open') throw new Error('Open request not found');
      if (status==='mapped' && !mappedTo) throw new Error('Mapped target required');
      if (status==='mapped' && mappedTo) {
        const key = r.kind==='make'?'makes':r.kind==='model'?'models':r.kind==='grade'?'grades':'generations';
        const exists = r.kind==='chassis'
          ? c.generations.some(g=>g.chassis.some(m=>m.code===mappedTo))
          : c[key].some(x=>x.id===mappedTo);
        if(!exists) throw new Error('Mapped target does not exist');
      }
      Object.assign(r,{status,mappedTo,reviewedAt:new Date().toISOString(),reviewerId:actor.id});
      return r;
    });
  }
  async upsertMake(actor:AdminActor,value:Make) {requireAdmin(actor);return this.upsert('makes',value);}
  async upsertModel(actor:AdminActor,value:Model) {requireAdmin(actor);return this.upsert('models',value);}
  async upsertGeneration(actor:AdminActor,value:Generation) {requireAdmin(actor);return this.upsert('generations',value);}
  async upsertGrade(actor:AdminActor,value:Grade) {requireAdmin(actor);return this.upsert('grades',value);}
  async upsertFeature(actor:AdminActor,value:Feature) {requireAdmin(actor);return this.upsert('features',value);}
  async importLicensed(actor:AdminActor,provider:LicensedCatalogProvider) {
    requireAdmin(actor);
    if(!provider.name.trim()) throw new Error('Provider name required');
    const batch=await provider.load();
    return this.mutate(c=>{
      for(const key of ['makes','models','generations','grades','features'] as const) {
        const target=c[key] as Array<{id:string}>;
        for(const value of batch[key]) {
          const i=target.findIndex(x=>x.id===value.id);
          if(i<0) target.push(clone(value)); else target[i]=clone(value);
        }
      }
      return {provider:provider.name,counts:{makes:batch.makes.length,models:batch.models.length,
        generations:batch.generations.length,grades:batch.grades.length,features:batch.features.length}};
    });
  }
  private async upsert<K extends 'makes'|'models'|'generations'|'grades'|'features'>(key:K,value:CatalogSnapshot[K][number]) {
    return this.mutate(c=>{
      const arr=c[key] as Array<typeof value>;
      const i=arr.findIndex(x=>x.id===value.id);
      if(i<0) arr.push(clone(value)); else arr[i]=clone(value);
      return value;
    });
  }
  private async mutate<T>(fn:(c:CatalogSnapshot)=>T):Promise<T> {
    for(let attempt=0;attempt<3;attempt++) {
      const c=await this.snapshot();const result=fn(c);validateCatalog(c);
      try {await this.store.save({...c,version:c.version+1},c.version);return clone(result);}
      catch(e) {if(String(e).includes('version conflict')) continue;throw e;}
    }
    throw new Error('Catalog version conflict; retry');
  }
}
