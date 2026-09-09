import { createId, createPage, createBlock } from './helpers';
import { db } from '../db/database';
import { usePageStore } from '../stores/pageStore';

/**
 * Compresses an object into a compact, URL-safe Base64 string.
 * Uses browser-native CompressionStream('gzip') when available.
 */
export async function compressSnapshot(payload) {
  try {
    const jsonString = JSON.stringify(payload);

    if (typeof CompressionStream !== 'undefined') {
      const stream = new Blob([jsonString]).stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
      const chunks = [];
      const reader = compressedStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const uint8 = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        uint8.set(chunk, offset);
        offset += chunk.length;
      }

      let binary = '';
      const len = uint8.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return 'gz:' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    // Fallback: URL-safe Base64 encoded JSON
    const utf8Bytes = new TextEncoder().encode(jsonString);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return 'raw:' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to compress snapshot:', err);
    throw err;
  }
}

/**
 * Decompresses a URL-safe Base64 string back into the original object.
 */
export async function decompressSnapshot(encodedString) {
  try {
    if (!encodedString) return null;

    if (encodedString.startsWith('gz:')) {
      const base64url = encodedString.slice(3);
      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const stream = new Blob([bytes]).stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
      const response = new Response(decompressedStream);
      const text = await response.text();
      return JSON.parse(text);
    }

    if (encodedString.startsWith('raw:')) {
      const base64url = encodedString.slice(4);
      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const text = new TextDecoder().decode(bytes);
      return JSON.parse(text);
    }

    // Try legacy / direct JSON parse
    return JSON.parse(decodeURIComponent(atob(encodedString)));
  } catch (err) {
    console.error('Failed to decompress snapshot:', err);
    return null;
  }
}

/**
 * Clones a snapshot into the user's local Dexie IndexedDB workspace.
 * Returns the cloned page object.
 */
export async function cloneSnapshotToWorkspace(snapshot) {
  if (!snapshot || !snapshot.title) {
    throw new Error('Invalid snapshot data for workspace cloning.');
  }

  const newPageId = createId();
  const now = Date.now();

  const newPage = createPage({
    id: newPageId,
    title: snapshot.title,
    icon: snapshot.icon || '📄',
    coverImage: snapshot.coverImage || null,
    fullWidth: snapshot.fullWidth !== false,
    createdAt: now,
    updatedAt: now,
    lastViewedAt: now,
  });

  // Prepare blocks with new IDs mapped to the new page ID
  const oldToNewBlockMap = {};
  const rawBlocks = Array.isArray(snapshot.blocks) ? snapshot.blocks : [];

  const newBlocks = rawBlocks.map((b, idx) => {
    const newId = createId();
    oldToNewBlockMap[b.id] = newId;

    // Lexical sorting or fallback
    const sortLetter = String.fromCharCode(97 + Math.min(idx, 25));

    return createBlock(newPageId, b.type || 'text', {
      id: newId,
      content: b.content || '',
      properties: b.properties || {},
      sortOrder: b.sortOrder || sortLetter,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Persist directly to IndexedDB
  await db.pages.put(newPage);
  if (newBlocks.length > 0) {
    await db.blocks.bulkPut(newBlocks);
  }

  // Refresh active Zustand page store if running
  const pageStore = usePageStore.getState();
  if (pageStore?.loadPages) {
    await pageStore.loadPages();
  }

  return newPage;
}
