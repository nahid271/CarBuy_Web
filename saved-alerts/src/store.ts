import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { SavedState, SavedStore } from './types.ts';

const empty=():SavedState=>({cars:[],recent:[],alerts:[],deliveries:[]});
const copy=<T>(value:T):T=>structuredClone(value);
export class MemorySavedStore implements SavedStore{
  private state=empty();private queue:Promise<void>=Promise.resolve();
  async read(){return copy(this.state)}
  async transaction<T>(fn:(state:SavedState)=>T):Promise<T>{
    let release!:()=>void;const previous=this.queue;this.queue=new Promise(resolve=>{release=resolve});await previous;
    try{const next=copy(this.state),result=fn(next);this.state=next;return copy(result)}finally{release()}
  }
}
// Single-process demo persistence. Use the SQL schema and a transactional adapter in production.
export class JsonSavedStore implements SavedStore{
  private queue:Promise<void>=Promise.resolve();private readonly path:string;
  constructor(path:string){this.path=path}
  async read():Promise<SavedState>{try{return JSON.parse(await readFile(this.path,'utf8')) as SavedState}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return empty();throw error}}
  async transaction<T>(fn:(state:SavedState)=>T):Promise<T>{
    let release!:()=>void;const previous=this.queue;this.queue=new Promise(resolve=>{release=resolve});await previous;
    try{const next=await this.read(),result=fn(next);await mkdir(dirname(this.path),{recursive:true});
      const tmp=`${this.path}.${randomUUID()}.tmp`;await writeFile(tmp,JSON.stringify(next,null,2)+'\n',{mode:0o600});
      await rename(tmp,this.path);return copy(result)}finally{release()}
  }
}
