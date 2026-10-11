
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
