import { resolve } from 'node:path';
import { CatalogService } from './catalog.ts';
import { JsonFileCatalogStore } from './store.ts';
import { validateBangladeshRegistration } from './validation.ts';
import type { AdminActor, Feature, Generation, Grade, Make, Model } from './types.ts';

const [command,...args]=process.argv.slice(2);
const path=resolve(process.env.CARBUY_CATALOG_FILE || '.local/catalog.json');
const service=new CatalogService(new JsonFileCatalogStore(path));
const admin:AdminActor={id:process.env.CARBUY_ADMIN_ACTOR || 'local-cli',role:'vehicle_catalog_admin'};
function usage():never {
  process.stderr.write(`Usage:\n  npm run demo -- decode <chassis>\n  npm run demo -- registration <plate>\n  npm run demo -- catalog\n  npm run demo -- request <make|model|generation|grade|chassis> <text> [context JSON]\n  npm run demo -- admin-requests\n  npm run demo -- admin-upsert <make|model|generation|grade|feature> '<JSON>'\n  npm run demo -- admin-resolve <request-id> <mapped|rejected> [target-id]\n`);
  process.exit(2);
}
async function main() {
  let result:unknown;
  switch(command) {
    case 'decode': if(!args[0])usage();result=await service.decode(args[0]);break;
    case 'registration': if(!args[0])usage();result=validateBangladeshRegistration(args.join(' '));break;
    case 'catalog': result=await service.snapshot();break;
    case 'request': if(!args[0] || !args[1])usage();result=await service.submitUnknown(args[0] as 'make'|'model'|'generation'|'grade'|'chassis',args[1],args[2]?JSON.parse(args[2]):{});break;
    case 'admin-requests': result=await service.mappingRequests(admin);break;
    case 'admin-resolve': if(!args[0] || !args[1])usage();result=await service.resolveRequest(admin,args[0],args[1] as 'mapped'|'rejected',args[2]);break;
    case 'admin-upsert': {
      if(!args[0] || !args[1])usage();const obj=JSON.parse(args[1]);
      switch(args[0]) {
        case 'make':result=await service.upsertMake(admin,obj as Make);break;
        case 'model':result=await service.upsertModel(admin,obj as Model);break;
        case 'generation':result=await service.upsertGeneration(admin,obj as Generation);break;
        case 'grade':result=await service.upsertGrade(admin,obj as Grade);break;
        case 'feature':result=await service.upsertFeature(admin,obj as Feature);break;
        default:usage();
      }
      break;
    }
    default:usage();
  }
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
main().catch(error=>{process.stderr.write(`${error instanceof Error?error.message:String(error)}\n`);process.exitCode=1;});
