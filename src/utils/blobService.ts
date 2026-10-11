/**
 * BlobService — stores images as Blobs in a dedicated IndexedDB table,
 * keyed by SHA-256 hash for deduplication. Block/page records store only
 * a lightweight "blob://<hash>" reference string.
 */
import { db } from '../db/database';

// In-memory cache: hash → objectURL
const urlCache = new Map<string, string>();

/**
 * Computes a hex SHA-256 hash of an ArrayBuffer.
 */
async function hashBuffer(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stores a File/Blob in the blobs table, deduplicating by content hash.
 */
export async function storeBlob(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await hashBuffer(buffer);

  const existing = await db.blobs.get(hash);
  if (!existing) {
    await db.blobs.put({
      hash,
      blob: new Blob([buffer], { type: file.type || 'application/octet-stream' }),
      mimeType: file.type || 'application/octet-stream',
      size: buffer.byteLength,
      createdAt: Date.now(),
    } as any);
  }

  return `blob://${hash}`;
}

/**
 * Resolves a "blob://<hash>" reference to a renderable object URL.
 * Uses an in-memory cache to avoid recreating URLs.
 */
export async function loadBlobUrl(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;

  if (!ref.startsWith('blob://')) return ref;

  const hash = ref.slice(7);

  if (urlCache.has(hash)) return urlCache.get(hash)!;

  const record: any = await db.blobs.get(hash);
  if (!record || !record.blob) return null;

  const url = URL.createObjectURL(record.blob);
  urlCache.set(hash, url);
  return url;
}

/**
 * Revokes a previously created object URL and removes it from cache.
 */
export function revokeBlob(ref: string | null | undefined): void {
  if (!ref || !ref.startsWith('blob://')) return;
  const hash = ref.slice(7);
  const url = urlCache.get(hash);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(hash);
  }
}

/**
 * Checks if a string is a blob reference.
 */
export function isBlobRef(src: any): boolean {
  return typeof src === 'string' && src.startsWith('blob://');
}

/**
 * Resolves a blob reference to a base64 data URL (for backup export).
 */
export async function blobRefToDataUrl(ref: string | null | undefined): Promise<string | null> {
  if (!ref || !ref.startsWith('blob://')) return ref || null;
  const hash = ref.slice(7);
  const record: any = await db.blobs.get(hash);
  if (!record || !record.blob) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(record.blob);
  });
}
