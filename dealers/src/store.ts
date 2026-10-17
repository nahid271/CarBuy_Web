import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import type { DealerState, DealerStore } from './types.ts';

const empty = (): DealerState => ({ applications: [], orgs: [], ledger: [], purchases: [], leads: [], notifications: [], audit: [] });
const copy = <T>(value:T):T => structuredClone(value);
export class MemoryDealerStore implements DealerStore {
  private state=empty(); private queue:Promise<void>=Promise.resolve();
  async read(){return copy(this.state)}
  async transaction<T>(fn:(state:DealerState)=>T):Promise<T>{
    let release!:()=>void;const previous=this.queue;this.queue=new Promise(resolve=>{release=resolve});await previous;
    try{const next=copy(this.state);const result=fn(next);this.state=next;return copy(result)}finally{release()}
  }
}
// The local demo uses one process. A production adapter must transact the
// credit ledger, purchases, membership and listing status in PostgreSQL.
export class JsonDealerStore implements DealerStore {
  private queue:Promise<void>=Promise.resolve(); private readonly path:string;
  constructor(path:string){this.path=path}
  async read():Promise<DealerState>{try{return JSON.parse(await readFile(this.path,'utf8')) as DealerState}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return empty();throw error}}
  async transaction<T>(fn:(state:DealerState)=>T):Promise<T>{
    let release!:()=>void;const previous=this.queue;this.queue=new Promise(resolve=>{release=resolve});await previous;
    try{const next=await this.read();const result=fn(next);await mkdir(dirname(this.path),{recursive:true});
      const temp=`${this.path}.${randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(next,null,2)+'\n',{mode:0o600});
      await rename(temp,this.path);return copy(result)}finally{release()}
  }
}
