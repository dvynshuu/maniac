/**
 * Notion Asset Extractor and Hasher
 * 
 * Extracts binary attachments and images from ZIP archive,
 * computes SHA-256 content hashes, detects MIME types,
 * and builds path resolution mappings.
 */

import { sha256, generateAssetId } from '../normalization/idGenerator.js';
import { normalizePath } from '../normalization/pathNormalizer.js';

/**
 * Returns MIME type based on file extension
 * @param {string} filename
 * @returns {string}
 */
export function getMimeType(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'bmp': return 'image/bmp';
    case 'ico': return 'image/x-icon';
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

/**
 * Converts an ArrayBuffer to binary string for sha256 hashing
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function bufferToBinaryString(buffer) {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  let binary = '';
  // Process in chunks to prevent stack overflow
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return binary;
}

/**
 * Computes SHA-256 of an ArrayBuffer using native crypto.subtle
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>}
 */
export async function hashArrayBuffer(buffer) {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const binaryStr = bufferToBinaryString(buffer);
  return sha256(binaryStr);
}

/**
 * Extracts all binary assets from the loaded JSZip instance.
 * @param {import('jszip')} zip
 * @param {(progress: {percent: number, detail: string}) => void} [onProgress]
 * @param {string} [rootPrefix='']
 * @returns {Promise<{
 *   assets: import('../model/types').NotionImportAsset[],
 *   assetMap: Map<string, import('../model/types').NotionImportAsset>,
 *   hashMap: Map<string, import('../model/types').NotionImportAsset>
 * }>}
 */
export async function extractAssets(zip, onProgress = () => {}, rootPrefix = '') {
  const assetFiles = [];
  const imageRegex = /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico|pdf)$/i;

  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    if (imageRegex.test(path)) {
      assetFiles.push({ path, zipEntry });
    }
  }

  const assets = [];
  const assetMap = new Map(); // normalized ZIP path -> asset
  const hashMap = new Map();  // content hash -> asset

  for (let i = 0; i < assetFiles.length; i++) {
    const { path, zipEntry } = assetFiles[i];
    let normPath = normalizePath(path);
    if (rootPrefix && normPath.startsWith(rootPrefix)) {
      normPath = normPath.slice(rootPrefix.length);
    }

    onProgress({
      percent: Math.round(((i + 1) / Math.max(1, assetFiles.length)) * 100),
      detail: `Extracting asset: ${normPath}`,
    });

    const arrayBuffer = await zipEntry.async('arraybuffer');
    const hash = await hashArrayBuffer(arrayBuffer);
    const mimeType = getMimeType(path);
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const assetId = generateAssetId(hash);

    const asset = {
      id: assetId,
      originalPath: path,
      zipPath: normPath,
      hash,
      mimeType,
      blob,
      size: arrayBuffer.byteLength,
    };

    assets.push(asset);
    assetMap.set(normPath, asset);
    hashMap.set(hash, asset);
  }

  return { assets, assetMap, hashMap };
}
