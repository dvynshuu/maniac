/**
 * Security Service for database encryption using Web Crypto API.
 * Uses PBKDF2 for key derivation and AES-GCM for encryption.
 * 
 * Architecture:
 * - A persistent "master salt" is generated on first setup and stored in localStorage.
 * - The master password is used once to derive a CryptoKey via PBKDF2.
 * - Only the opaque CryptoKey handle is kept in memory; the plaintext password is discarded.
 * - Each encrypt call uses its own random IV for per-record uniqueness.
 */

const ITERATIONS = 100000;
const IV_SIZE = 12;
const MASTER_SALT_KEY = 'maniac_master_salt';
const CANARY_STRING = 'MANIAC_CANARY_OK';

export interface DerivedKeyBundle {
  aesKey: CryptoKey;
  hmacKey: CryptoKey;
}

export class SecurityService {
  /**
   * Retrieves or generates the persistent master salt.
   * The salt is stored base64-encoded in localStorage.
   */
  static getMasterSalt(): Uint8Array {
    let b64 = localStorage.getItem(MASTER_SALT_KEY);
    if (b64) {
      return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    let binary = '';
    for (let i = 0; i < salt.length; i++) {
      binary += String.fromCharCode(salt[i]);
    }
    localStorage.setItem(MASTER_SALT_KEY, btoa(binary));
    return salt;
  }

  /**
   * Derive both an AES-GCM key and an HMAC key (for blind indexing) from a password + salt.
   */
  static async deriveKeys(password: string, salt: Uint8Array): Promise<DerivedKeyBundle> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt as any, iterations: ITERATIONS, hash: 'SHA-256' },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Derive a separate HMAC key for blind indexing search
    const hmacSalt = new Uint8Array(salt);
    hmacSalt[0] ^= 0xFF; // Slightly modify salt to get a different key

    const hmacKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: hmacSalt as any, iterations: ITERATIONS, hash: 'SHA-256' },
      passwordKey,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['sign', 'verify']
    );

    return { aesKey, hmacKey };
  }

  /**
   * Derives long-lived CryptoKeys from the user's password using the
   * persistent master salt. This key is stored in Zustand; the plaintext
   * password is discarded immediately after this call.
   */
  static async deriveKeysFromPassword(password: string): Promise<DerivedKeyBundle> {
    const salt = this.getMasterSalt();
    return this.deriveKeys(password, salt);
  }

  // ─── Password Verification (canary-based) ──────────────────

  /**
   * Creates a verifier blob by encrypting a known canary string.
   * Store the returned base64 string in localStorage during setup.
   */
  static async createVerifier(password: string): Promise<string> {
    const keys = await this.deriveKeysFromPassword(password);
    return this.encryptWithKey(CANARY_STRING, keys.aesKey);
  }

  /**
   * Verifies a password by attempting to decrypt the stored canary.
   */
  static async verifyPassword(password: string, verifierBlob: string): Promise<boolean> {
    try {
      const keys = await this.deriveKeysFromPassword(password);
      const decrypted = await this.decryptWithKey(verifierBlob, keys.aesKey);
      return decrypted === CANARY_STRING;
    } catch {
      return false;
    }
  }

  /**
   * Basic heuristic to check if a string is likely encrypted.
   * Checks if it's valid Base64 and has minimum IV length.
   */
  static isEncrypted(val: any): boolean {
    if (typeof val !== 'string') return false;
    if (val.startsWith('menc:')) return true;
    if (val.length < 40) return false;
    try {
      if (!/^[A-Za-z0-9+/=]+$/.test(val)) return false;
      return true;
    } catch {
      return false;
    }
  }

  // ─── Encrypt / Decrypt ─────────────────────────────────────

  /**
   * Encrypts text using a CryptoKey (preferred) or a password string (legacy).
   */
  static async encrypt(text: string, keyOrPassword: CryptoKey | string): Promise<string> {
    if (!text) return text;
    if (typeof keyOrPassword === 'string') {
      const keys = await this.deriveKeysFromPassword(keyOrPassword);
      return this.encryptWithKey(text, keys.aesKey);
    }
    return this.encryptWithKey(text, keyOrPassword);
  }

  /**
   * Decrypts text using a CryptoKey (preferred) or a password string (legacy).
   */
  static async decrypt(encryptedBase64: string, keyOrPassword: CryptoKey | string): Promise<string | null> {
    if (!encryptedBase64 || typeof encryptedBase64 !== 'string') return encryptedBase64;
    if (typeof keyOrPassword === 'string') {
      const keys = await this.deriveKeysFromPassword(keyOrPassword);
      return this.decryptWithKey(encryptedBase64, keys.aesKey);
    }
    return this.decryptWithKey(encryptedBase64, keyOrPassword);
  }

  // ─── Internal: CryptoKey-based encrypt/decrypt ─────────────

  static async encryptWithKey(text: string, key: CryptoKey): Promise<string> {
    if (!text) return text;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    let binary = '';
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < combined.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode.apply(null, Array.from(combined.subarray(i, i + CHUNK_SIZE)));
    }
    return 'menc:' + btoa(binary);
  }

  static async decryptWithKey(encryptedBase64: string, key: CryptoKey): Promise<string | null> {
    if (!encryptedBase64 || typeof encryptedBase64 !== 'string') return encryptedBase64;

    const hasPrefix = encryptedBase64.startsWith('menc:');
    const cleanBase64 = hasPrefix ? encryptedBase64.substring(5) : encryptedBase64;

    try {
      const combined = new Uint8Array(
        atob(cleanBase64)
          .split('')
          .map((c) => c.charCodeAt(0))
      );

      if (combined.length < IV_SIZE) {
        throw new Error('Data too small for IV');
      }

      const iv = combined.slice(0, IV_SIZE);
      const data = combined.slice(IV_SIZE);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      if (hasPrefix) {
        console.error('Decryption failed for prefixed data', e);
        return null;
      }
      return encryptedBase64;
    }
  }

  // ─── Blind Indexing ────────────────────────────────────────

  static async hmacWord(word: string, hmacKey: CryptoKey): Promise<string> {
    if (!word || !hmacKey) return word;
    const encoder = new TextEncoder();
    const data = encoder.encode(word);
    const signature = await crypto.subtle.sign('HMAC', hmacKey, data);
    
    const hashArray = Array.from(new Uint8Array(signature).slice(0, 16));
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hex;
  }
}
