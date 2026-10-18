import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ActivityState, ActivityStore } from './types.ts';

const empty=():ActivityState=>({leads:[],reveals:[],reports:[],orders:[]});
const copy=<T>(x:T):T=>structuredClone(x);
export class MemoryActivityStore implements ActivityStore {
  private state=empty();private queue:Promise<void>=Promise.resolve();
  async read(){return copy(this.state)}
  async transaction<T>(fn:(state:ActivityState)=>T):Promise<T>{
    let release!:()=>void;const previous=this.queue;this.queue=new Promise(resolve=>{release=resolve});await previous;
    try{const next=copy(this.state),result=fn(next);this.state=next;return copy(result)}finally{release()}
  }
}
// Local single-process activity persistence. A production adapter must use
// PostgreSQL transactions and the 005 migration for concurrent requests.
export class JsonActivityStore implements ActivityStore {
  private queue:Promise<void>=Promise.resolve();
  private readonly path:string;
  constructor(path:string){this.path=path}
  async read():Promise<ActivityState>{try{return JSON.parse(await readFile(this.path,'utf8')) as ActivityState}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return empty();throw error}}
  async transaction<T>(fn:(state:ActivityState)=>T):Promise<T>{
    let release!:()=>void;const previous=this.queue;this.queue=new Promise(resolve=>{release=resolve});await previous;
    try{const next=await this.read(),result=fn(next);await mkdir(dirname(this.path),{recursive:true});
      const temp=`${this.path}.${randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(next,null,2)+'\n',{mode:0o600});
      await rename(temp,this.path);return copy(result)}finally{release()}
  }
}
