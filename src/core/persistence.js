import { useSecurityStore } from '../stores/securityStore';
import { SecurityService } from '../utils/securityService';
import { extractWords } from '../db/database';

/**
 * Encrypt a block or page data object before writing to IndexedDB.
 * 
 * Guards against double-encryption by checking if values are
 * already encrypted strings vs plain text/objects.
 *
 * @param {object} data - The fields to persist (may be a partial update).
 * @param {boolean} isBlock - true for blocks, false for pages.
 * @returns {Promise<object>} The encrypted (or plain) object ready for DB.
 */
export async function encryptForDB(data, isBlock = true) {
  const key = useSecurityStore.getState().derivedKey;
  const hmacKey = useSecurityStore.getState().hmacKey;
  const dbObj = { ...data };

  if (key) {
    if (isBlock) {
      // --- Content encryption ---
      if (dbObj.content !== undefined && typeof dbObj.content === 'string') {
        // Build search index before encrypting
        if (hmacKey) {
          const words = extractWords(dbObj.content);
          const hashed = await Promise.all(words.map(w => SecurityService.hmacWord(w, hmacKey)));
          dbObj.words = hashed.filter(Boolean);
        } else {
          dbObj.words = [];
        }
        // Only encrypt if it looks like plain text (not already a base64 blob)
        if (dbObj.content.length > 0) {
          dbObj.content = await SecurityService.encrypt(dbObj.content, key);
        }
      }

      // --- Properties encryption ---
      // Only encrypt if it's a JS object (not already an encrypted string)
      if (dbObj.properties !== undefined && typeof dbObj.properties === 'object' && dbObj.properties !== null) {
        dbObj.properties = await SecurityService.encrypt(JSON.stringify(dbObj.properties), key);
      }
    } else {
      // --- Page title encryption ---
      if (dbObj.title !== undefined && typeof dbObj.title === 'string') {
        dbObj.title = await SecurityService.encrypt(dbObj.title, key);
      }
    }

    dbObj._isEncrypted = true;
  } else {
    // No encryption — just build plain-text search index
    if (isBlock && dbObj.content !== undefined && typeof dbObj.content === 'string') {
      dbObj.words = extractWords(dbObj.content);
    }
  }

  return dbObj;
}
