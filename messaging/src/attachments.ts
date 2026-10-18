import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { preparePhoto } from '../../listings/src/media.ts';

export class LocalChatImages{
  private readonly root:string;constructor(root:string){this.root=root}
  async save(input:Buffer):Promise<string>{
    if(input.length>6*1024*1024)throw new Error('Image must be under 6 MB');
    const {webp}=await preparePhoto(input);
    const key=`${randomUUID()}.webp`;
    await mkdir(this.root,{recursive:true,mode:0o700});await writeFile(join(this.root,key),webp,{mode:0o600});return key;
  }
  async read(key:string):Promise<Buffer>{
    if(!/^[a-f0-9-]{36}\.webp$/.test(key))throw new Error('Invalid image key');
    return readFile(join(this.root,key));
  }
}
