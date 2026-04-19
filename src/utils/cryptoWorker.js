import { SecurityService } from './securityService';

/**
 * Utility to decrypt an array of items in small batches, yielding to the 
 * main thread between batches to prevent UI freezes.
 * 
 * @param {Array} items - The items to decrypt.
 * @param {CryptoKey} key - The derived CryptoKey.
 * @param {Function} decryptFn - An async function(item, key) that decrypts the item and returns the result.
 * @param {number} batchSize - Number of items to decrypt before yielding.
 * @param {Function} onProgress - Optional callback(decryptedItems) invoked as batches complete.
 * @returns {Promise<Array>} The fully decrypted array.
 */
export async function batchDecrypt(items, key, decryptFn, batchSize = 20, onProgress = null) {
  if (!items || items.length === 0) return [];

  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch in parallel
    const decryptedBatch = await Promise.all(
      batch.map(item => decryptFn(item, key))
    );
    
    results.push(...decryptedBatch);
    
    if (onProgress) {
      onProgress([...results]); // clone to trigger React renders if needed
    }
    
    // Yield to the main thread (allows browser to paint and handle events)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
}
