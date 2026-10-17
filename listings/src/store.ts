import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ListingStore, State } from './types.ts';

const empty = (): State => ({ listings: [], vehicles: [], audit: [] });
const copy = <T>(value: T): T => structuredClone(value);

export class MemoryListingStore implements ListingStore {
  private state = empty();
  private queue: Promise<void> = Promise.resolve();
  async read() { return copy(this.state); }
  async transaction<T>(fn: (state: State) => T): Promise<T> {
    let release!: () => void;
    const previous = this.queue;
    this.queue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      const next = copy(this.state);
      const result = fn(next);
      this.state = next;
      return copy(result);
    } finally { release(); }
  }
}

// One local process only. Production writes must use the PostgreSQL migration
// and transactions/row locks so concurrent app instances enforce the same limits.
export class JsonListingStore implements ListingStore {
  private queue: Promise<void> = Promise.resolve();
  private readonly path: string;
  constructor(path: string) { this.path = path; }
  async read(): Promise<State> {
    try { return JSON.parse(await readFile(this.path, 'utf8')) as State; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return empty(); throw error; }
  }
  async transaction<T>(fn: (state: State) => T): Promise<T> {
    let release!: () => void;
    const previous = this.queue;
    this.queue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      const next = await this.read();
      const result = fn(next);
      await mkdir(dirname(this.path), { recursive: true });
      const temp = `${this.path}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
      await rename(temp, this.path);
      return structuredClone(result);
    } finally { release(); }
  }
}
