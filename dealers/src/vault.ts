import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class NidVault {
  private readonly key:Buffer;
  constructor(key:Buffer){if(key.length!==32)throw new Error('NID encryption key must be 32 bytes');this.key=key}
  encrypt(value:string):string{
    const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',this.key,iv);
    const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
    return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
  }
  decrypt(value:string):string{
    const bytes=Buffer.from(value,'base64url');if(bytes.length<29)throw new Error('Invalid encrypted NID');
    const decipher=createDecipheriv('aes-256-gcm',this.key,bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));
    return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8');
  }
}
export async function localDemoVault(path:string):Promise<NidVault>{
  try{return new NidVault(await readFile(path))}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
    await mkdir(dirname(path),{recursive:true,mode:0o700});const key=randomBytes(32);
    await writeFile(path,key,{mode:0o600,flag:'wx'});return new NidVault(key)}
}
