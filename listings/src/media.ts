import sharp from 'sharp';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Actor, ListingPhoto, Paper, PaperType } from './types.ts';

const maxImageBytes = 12 * 1024 * 1024;
const rasterFormats = new Set(['jpeg', 'png', 'webp', 'avif', 'heif']);
function checkSize(bytes: Buffer, limit: number) { if (!bytes.length || bytes.length > limit) throw new Error('File size is not allowed'); }
async function blurHint(bytes: Buffer): Promise<boolean> {
  const { data, info } = await sharp(bytes).resize(96, 96, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const values: number[] = [];
  for (let y=1;y<info.height-1;y++) for (let x=1;x<info.width-1;x++) {
    const at=y*info.width+x;
    values.push(4*data[at]-data[at-1]-data[at+1]-data[at-info.width]-data[at+info.width]);
  }
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  const variance=values.reduce((a,b)=>a+(b-mean)**2,0)/values.length;
  return variance<18;
}

export async function preparePhoto(bytes: Buffer): Promise<{ photo: ListingPhoto; webp: Buffer; avif: Buffer }> {
  checkSize(bytes, maxImageBytes);
  const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'error' });
  const metadata = await image.metadata();
  if (!metadata.format || !rasterFormats.has(metadata.format) || !metadata.width || !metadata.height) throw new Error('Use a raster photo');
  if (metadata.width < 600 || metadata.height < 400) throw new Error('Photo is too small');
  const normalized = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).toBuffer();
  const [webp, avif, stats, blurry] = await Promise.all([
    sharp(normalized).webp({ quality: 78 }).toBuffer(),
    sharp(normalized).avif({ quality: 48, effort: 2 }).toBuffer(),
    sharp(normalized).stats(),
    blurHint(normalized),
  ]);
  const hints: string[] = [];
  if (stats.channels.slice(0, 3).reduce((sum, channel) => sum + channel.mean, 0) / Math.min(stats.channels.length, 3) < 48) hints.push('dark');
  if (blurry) hints.push('blurry');
  const output = await sharp(webp).metadata();
  return { photo: { id: randomUUID(), position: 0, webpKey: '', avifKey: '', sha256: createHash('sha256').update(webp).digest('hex'), width: output.width!, height: output.height!, hints }, webp, avif };
}

export async function preparePaper(bytes: Buffer, type: PaperType): Promise<{ paper: Paper; bytes: Buffer; extension: string }> {
  if (!['registration','smart_card','tax_token','fitness'].includes(type)) throw new Error('Invalid paper type');
  checkSize(bytes, 10 * 1024 * 1024);
  let sanitized: Buffer;
  let extension: string;
  if (bytes.subarray(0, 5).toString() === '%PDF-') { sanitized = bytes; extension = 'pdf'; }
  else {
    const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
    if (!metadata.format || !rasterFormats.has(metadata.format)) throw new Error('Use an image or PDF for papers');
    sanitized = await sharp(bytes).rotate().webp({ quality: 85 }).toBuffer();
    extension = 'webp';
  }
  return { paper: { id: randomUUID(), type, privateKey: '', uploadedAt: new Date().toISOString() }, bytes: sanitized, extension };
}

export class LocalMediaStore {
  private readonly root: string;
  constructor(root: string) { this.root = root; }
  async savePublic(id: string, ext: 'webp'|'avif', bytes: Buffer): Promise<string> {
    await mkdir(join(this.root, 'public'), { recursive: true });
    const key = `${id}.${ext}`;
    await writeFile(join(this.root, 'public', key), bytes, { mode: 0o644 });
    return key;
  }
  async savePrivate(id: string, ext: string, bytes: Buffer): Promise<string> {
    await mkdir(join(this.root, 'private'), { recursive: true, mode: 0o700 });
    const key = `${id}.${ext}`;
    await writeFile(join(this.root, 'private', key), bytes, { mode: 0o600 });
    return key;
  }
  async readPublic(key: string): Promise<Buffer> { if (!/^[a-f0-9-]+\.(webp|avif)$/.test(key)) throw new Error('Invalid media key'); return readFile(join(this.root, 'public', key)); }
  async readPrivate(actor: Actor, key: string): Promise<Buffer> {
    if (actor.role !== 'moderator') throw new Error('Moderator required');
    if (!/^[a-f0-9-]+\.(webp|pdf)$/.test(key)) throw new Error('Invalid media key');
    return readFile(join(this.root, 'private', key));
  }
}
