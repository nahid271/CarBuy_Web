import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { MessagingState,MessagingStore } from './types.ts';

const empty=():MessagingState=>({conversations:[],messages:[],leads:[],reports:[],notifications:[],attachments:[]});
const copy=<T>(x:T):T=>structuredClone(x);
export class MemoryMessagingStore implements MessagingStore {
  private state=empty();private queue:Promise<void>=Promise.resolve();
  async read(){return copy(this.state)}
  async transaction<T>(fn:(state:MessagingState)=>T):Promise<T>{
    let release!:()=>void;const previous=this.queue;this.queue=new Promise(resolve=>{release=resolve});await previous;
    try{const next=copy(this.state),result=fn(next);this.state=next;return copy(result)}finally{release()}
  }
}
// Single-process local persistence. Production uses the 006 PostgreSQL schema.
export class JsonMessagingStore implements MessagingStore {
  private queue:Promise<void>=Promise.resolve();private readonly path:string;
  constructor(path:string){this.path=path}
  async read():Promise<MessagingState>{try{return JSON.parse(await readFile(this.path,'utf8')) as MessagingState}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return empty();throw error}}
  async transaction<T>(fn:(state:MessagingState)=>T):Promise<T>{
    let release!:()=>void;const previous=this.queue;this.queue=new Promise(resolve=>{release=resolve});await previous;
    try{const next=await this.read(),result=fn(next);await mkdir(dirname(this.path),{recursive:true});
      const temporary=`${this.path}.${randomUUID()}.tmp`;await writeFile(temporary,JSON.stringify(next,null,2)+'\n',{mode:0o600});
      await rename(temporary,this.path);return copy(result)}finally{release()}
  }
}
