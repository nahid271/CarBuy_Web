import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CatalogSnapshot, CatalogStore } from './types.ts';
import { seedCatalog } from './seed.ts';

export class MemoryCatalogStore implements CatalogStore {
  private data:CatalogSnapshot=structuredClone(seedCatalog);
  async load() {return structuredClone(this.data);}
  async save(snapshot:CatalogSnapshot,expectedVersion:number) {
    if(this.data.version!==expectedVersion) throw new Error('Catalog version conflict');
    this.data=structuredClone(snapshot);
  }
}

// Local development / demo persistence. Production should implement CatalogStore
// with the Postgres schema in sql/001_vehicle_data.sql and a DB transaction.
export class JsonFileCatalogStore implements CatalogStore {
  private readonly path:string;
  constructor(path:string) {this.path=path;}
  async load():Promise<CatalogSnapshot> {
    try {return JSON.parse(await readFile(this.path,'utf8')) as CatalogSnapshot;}
    catch(e) {if((e as NodeJS.ErrnoException).code==='ENOENT') return structuredClone(seedCatalog);throw e;}
  }
  async save(snapshot:CatalogSnapshot,expectedVersion:number) {
    const current=await this.load();
    if(current.version!==expectedVersion) throw new Error('Catalog version conflict');
    await mkdir(dirname(this.path),{recursive:true});
    const temp=`${this.path}.${randomUUID()}.tmp`;
    await writeFile(temp,JSON.stringify(snapshot,null,2)+'\n',{mode:0o600});
    await rename(temp,this.path);
  }
}

type Queryable = { query(sql:string, params?:unknown[]):Promise<{rows:Array<{version:number;data:CatalogSnapshot}>;rowCount?:number|null}> };
// Pass a PostgreSQL client or pool. The SQL migration creates the state row.
export class PostgresCatalogStore implements CatalogStore {
  private readonly db:Queryable;
  constructor(db:Queryable) {this.db=db;}
  async load():Promise<CatalogSnapshot> {
    const result=await this.db.query('SELECT version, data FROM vehicle_catalog_state WHERE id = 1');
    if(!result.rows.length) return structuredClone(seedCatalog);
    const row=result.rows[0];
    if(row.data.version!==row.version) throw new Error('Catalog state version mismatch');
    return structuredClone(row.data);
  }
  async save(snapshot:CatalogSnapshot,expectedVersion:number) {
    const result=await this.db.query(
      `INSERT INTO vehicle_catalog_state (id, version, data, updated_at)
       VALUES (1, $1, $2::jsonb, now())
       ON CONFLICT (id) DO UPDATE
         SET version = EXCLUDED.version, data = EXCLUDED.data, updated_at = now()
       WHERE vehicle_catalog_state.version = $3`,
      [snapshot.version,JSON.stringify(snapshot),expectedVersion]);
    if(result.rowCount!==1) throw new Error('Catalog version conflict');
  }
}
