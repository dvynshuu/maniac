
/**
 * Utility to decrypt an array of items in small batches, yielding to the 
 * main thread between batches to prevent UI freezes.
 */
export async function batchDecrypt<T, R>(
  items: T[],
  key: CryptoKey,
  decryptFn: (item: T, key: CryptoKey) => Promise<R>,
  batchSize = 20,
  onProgress: ((results: R[]) => void) | null = null
): Promise<R[]> {
  if (!items || items.length === 0) return [];

  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch in parallel
    const decryptedBatch = await Promise.all(
      batch.map(item => decryptFn(item, key))
    );
    
    results.push(...decryptedBatch);
    
    if (onProgress) {
      onProgress([...results]);
    }
    
    // Yield to the main thread
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
}

/**
 * Encrypt a Blob, ArrayBuffer, or Uint8Array into an ArrayBuffer
 * and return it with a Transferable list to eliminate structured-clone serialization thrashing.
 */
export async function encryptBlobTransferable(
  data: Blob | ArrayBuffer | Uint8Array,
  key: CryptoKey
): Promise<{ buffer: ArrayBuffer; iv: Uint8Array; transferList: Transferable[] }> {
  let rawBuffer: ArrayBuffer;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    rawBuffer = await data.arrayBuffer();
  } else if (data instanceof Uint8Array) {
    rawBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  } else if (data instanceof ArrayBuffer) {
    rawBuffer = data;
  } else {
    rawBuffer = await (data as any).arrayBuffer();
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    rawBuffer
  );

  return {
    buffer: ciphertextBuffer,
    iv,
    transferList: [ciphertextBuffer]
  };
}

/**
 * Decrypt a transferred ArrayBuffer using AES-GCM and return the resulting
 * plaintext ArrayBuffer with a Transferable list for zero-copy forwarding.
 */
export async function decryptBlobTransferable(
  ciphertextBuffer: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey
): Promise<{ buffer: ArrayBuffer; transferList: Transferable[] }> {
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    ciphertextBuffer
  );

  return {
    buffer: plaintextBuffer,
    transferList: [plaintextBuffer]
  };
}

/**
 * Safely posts a message with Transferable objects, falling back to standard
 * postMessage if Transferable is not supported or rejected by the harness.
 */
export function postTransferable(
  target: { postMessage: (msg: any, transfer?: any) => void },
  message: any,
  transferList: Transferable[] = []
): void {
  try {
    if (transferList && transferList.length > 0) {
      target.postMessage(message, transferList);
    } else {
      target.postMessage(message);
    }
  } catch {
    target.postMessage(message);
  }
}
