/**
 * BlobService — stores images as Blobs in a dedicated IndexedDB table,
 * keyed by SHA-256 hash for deduplication. Block/page records store only
 * a lightweight "blob://<hash>" reference string.
 */
import { db } from '../db/database';

// In-memory cache: hash → objectURL
const urlCache = new Map();

/**
 * Computes a hex SHA-256 hash of an ArrayBuffer.
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>}
 */
async function hashBuffer(buffer) {
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Stores a File/Blob in the blobs table, deduplicating by content hash.
 * @param {File|Blob} file
 * @returns {Promise<string>} A "blob://<hash>" reference string.
 */
export async function storeBlob(file) {
  const buffer = await file.arrayBuffer();
  const hash = await hashBuffer(buffer);

  // Check for deduplication
  const existing = await db.blobs.get(hash);
  if (!existing) {
    await db.blobs.put({
      hash,
      blob: new Blob([buffer], { type: file.type || 'application/octet-stream' }),
      mimeType: file.type || 'application/octet-stream',
      size: buffer.byteLength,
      createdAt: Date.now(),
    });
  }

  return `blob://${hash}`;
}

/**
 * Resolves a "blob://<hash>" reference to a renderable object URL.
 * Uses an in-memory cache to avoid recreating URLs.
 * @param {string} ref — A "blob://<hash>" string, or a legacy data: URL.
 * @returns {Promise<string|null>} An object URL, or the original string if not a blob ref.
 */
export async function loadBlobUrl(ref) {
  if (!ref) return null;

  // Not a blob reference — pass through (covers legacy data: URLs)
  if (!ref.startsWith('blob://')) return ref;

  const hash = ref.slice(7); // strip "blob://"

  // Check cache
  if (urlCache.has(hash)) return urlCache.get(hash);

  const record = await db.blobs.get(hash);
  if (!record || !record.blob) return null;

  const url = URL.createObjectURL(record.blob);
  urlCache.set(hash, url);
  return url;
}

/**
 * Revokes a previously created object URL and removes it from cache.
 * @param {string} ref — The "blob://<hash>" reference.
 */
export function revokeBlob(ref) {
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
 * @param {string} src
 * @returns {boolean}
 */
export function isBlobRef(src) {
  return typeof src === 'string' && src.startsWith('blob://');
}

/**
 * Resolves a blob reference to a base64 data URL (for backup export).
 * @param {string} ref — A "blob://<hash>" string.
 * @returns {Promise<string|null>} A data: URL string.
 */
export async function blobRefToDataUrl(ref) {
  if (!ref || !ref.startsWith('blob://')) return ref;
  const hash = ref.slice(7);
  const record = await db.blobs.get(hash);
  if (!record || !record.blob) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(record.blob);
  });
}
