import test from 'node:test';
import assert from 'node:assert/strict';
import { CatalogService, validateCatalog } from '../src/catalog.ts';
import { MemoryCatalogStore } from '../src/store.ts';
import { seedCatalog } from '../src/seed.ts';
import { bodyValues, engineBand, fuelValues } from '../src/values.ts';
import { chassisFormat, duplicateLiveChassis, validateBangladeshRegistration } from '../src/validation.ts';
import type { AdminActor, Generation } from '../src/types.ts';

const admin:AdminActor={id:'admin-1',role:'vehicle_catalog_admin'};
const other:AdminActor={id:'buyer-1',role:'other'};

test('VEH-01/02: curated hierarchy has required models and valid bilingual records', async()=>{
  validateCatalog(seedCatalog);
  const service=new CatalogService(new MemoryCatalogStore());
  const makes=await service.makes();
  assert.deepEqual(makes.map(x=>x.id),['toyota','honda','nissan']);
  const models=await service.models();
  for(const id of ['axio','allion','premio','corolla','fielder','noah','voxy','harrier','chr','prado','aqua','vezel','grace','xtrail']) {
    assert.ok(models.some(x=>x.id===id),`missing ${id}`);
  }
  assert.equal((await service.generations('premio')).length,1);
  assert.equal((await service.grades('premio-nzt260')).length,1);
  assert.equal((await service.gradeOptions('premio-nzt260')).at(-1)?.id,'not-listed');
  assert.equal((await service.generations('vezel'))[0].specs.transmission,'dct');
  assert.equal((await service.generations('grace'))[0].specs.transmission,'dct');
});

test('VEH-03: chassis decoder returns one candidate or asks seller to distinguish shared codes',async()=>{
  const service=new CatalogService(new MemoryCatalogStore());
  const unique=await service.decode('NHP10-1234567');
  assert.equal(unique.status,'matched');
  if(unique.status==='matched') {
    assert.equal(unique.candidates[0].model.id,'aqua');
    assert.equal(unique.candidates[0].engineCc,1496);
    assert.equal(unique.gradeConfirmationRequired,true);
  }
  const shared=await service.decode('NZT260-3173714');
  assert.equal(shared.status,'ambiguous');
  if(shared.status==='ambiguous') assert.deepEqual(shared.candidates.map(x=>x.model.id),['allion','premio']);
  assert.equal((await service.decode('ZZZ999-1234567')).status,'unknown');
  assert.equal((await service.decode('1HGCM82633A004352')).status,'vin');
});

test('VEH-04: Japanese, VIN and Bangladesh plate validation; only live duplicates count',()=>{
  assert.deepEqual(chassisFormat(' nzt260 - ৩১৭৩৭১৪ '),{valid:true,kind:'japanese',normalized:'NZT260-3173714',code:'NZT260'});
  assert.equal(chassisFormat('1HGCM82633A004352').valid,true);
  assert.equal(chassisFormat('1HGCM82633I004352').valid,false);
  assert.equal(chassisFormat('NZT260-12').valid,false);
  const en=validateBangladeshRegistration('Dhaka Metro-Ga 11-1234');
  const bn=validateBangladeshRegistration('ঢাকা মেট্রো-গ ১১-১২৩৪');
  assert.equal(en.valid,true);
  assert.equal(bn.valid,true);
  if(bn.valid) assert.equal(bn.vehicleClass,'GA');
  assert.equal(validateBangladeshRegistration('Dhaka Metro 11-1234').valid,false);
  const matches=duplicateLiveChassis('nzt260-3173714',[
    {id:'a',chassisNumber:'NZT260-3173714',status:'live'},
    {id:'b',chassisNumber:'NZT260-3173714',status:'sold'},
  ]);
  assert.deepEqual(matches.map(x=>x.id),['a']);
  assert.equal(duplicateLiveChassis('NZT260-3173714',[...matches], 'a').length,0);
});

test('VEH-05/06/07: local values and feature checklist are bilingual',async()=>{
  assert.equal(Object.keys(fuelValues).length,8);
  assert.equal(Object.keys(bodyValues).length,8);
  assert.equal(engineBand(1496)?.id,'1301_1500');
  assert.equal(engineBand(null),null);
  const features=await new CatalogService(new MemoryCatalogStore()).features();
  assert.ok(features.length>=40);
  for(const feature of features) {
    assert.ok(feature.name.en && feature.name.bn,feature.id);
  }
});

test('VEH-01/02: only admin can edit and unknown models enter a review queue',async()=>{
  const service=new CatalogService(new MemoryCatalogStore());
  const req=await service.submitUnknown('model','  New Model  ',{makeId:'toyota'});
  const duplicate=await service.submitUnknown('model','new model',{makeId:'toyota'});
  assert.equal(req.id,duplicate.id);
  await assert.rejects(service.mappingRequests(other),/admin role required/);
  assert.equal((await service.mappingRequests(admin)).length,1);
  await service.upsertModel(admin,{id:'new-model',makeId:'toyota',name:{en:'New Model',bn:'নতুন মডেল'},aliases:[],active:true});
  await service.resolveRequest(admin,req.id,'mapped','new-model');
  assert.equal((await service.mappingRequests(admin))[0].status,'mapped');
  await assert.rejects(service.upsertModel(other,{id:'bad',makeId:'toyota',name:{en:'Bad',bn:'ভুল'},aliases:[],active:true}),/admin role required/);
  const generation:Generation={id:'new-model-test',modelId:'new-model',name:{en:'Test',bn:'টেস্ট'},yearStart:null,yearEnd:null,
    chassis:[{code:'TEST99',sourceUrl:'https://example.org/licensed',engineCode:'X'}],
    specs:{body:'sedan',engineCc:1500,fuel:'petrol',transmission:'automatic',drive:'fwd',seats:5},active:true};
  await service.upsertGeneration(admin,generation);
  assert.equal((await service.decode('TEST99-1234567')).status,'matched');
  const imported=await service.importLicensed(admin,{name:'example licensed partner',load:async()=>({makes:[],models:[],
    generations:[{...generation,id:'new-model-licensed',chassis:[{code:'LIC123',sourceUrl:'https://example.org/licensed'}]}],
    grades:[],features:[]})});
  assert.equal(imported.counts.generations,1);
  assert.equal((await service.decode('LIC123-1234567')).status,'matched');
});
