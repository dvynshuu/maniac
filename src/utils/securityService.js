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

export class SecurityService {
  /**
   * Retrieves or generates the persistent master salt.
   * The salt is stored base64-encoded in localStorage.
   */
  static getMasterSalt() {
    let b64 = localStorage.getItem(MASTER_SALT_KEY);
    if (b64) {
      return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    }
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(MASTER_SALT_KEY, btoa(String.fromCharCode(...salt)));
    return salt;
  }

  /**
   * Derive a CryptoKey from a password + salt using PBKDF2.
   * @param {string} password
   * @param {Uint8Array} salt
   * @returns {Promise<CryptoKey>}
   */
  static async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derives a long-lived CryptoKey from the user's password using the
   * persistent master salt. This key is stored in Zustand; the plaintext
   * password is discarded immediately after this call.
   * @param {string} password
   * @returns {Promise<CryptoKey>}
   */
  static async deriveKeyFromPassword(password) {
    const salt = this.getMasterSalt();
    return this.deriveKey(password, salt);
  }

  // ─── Password Verification (canary-based) ──────────────────

  /**
   * Creates a verifier blob by encrypting a known canary string.
   * Store the returned base64 string in localStorage during setup.
   * @param {string} password
   * @returns {Promise<string>} base64-encoded encrypted canary
   */
  static async createVerifier(password) {
    const key = await this.deriveKeyFromPassword(password);
    return this.encryptWithKey(CANARY_STRING, key);
  }

  /**
   * Verifies a password by attempting to decrypt the stored canary.
   * @param {string} password
   * @param {string} verifierBlob — base64-encoded encrypted canary from localStorage
   * @returns {Promise<boolean>}
   */
  static async verifyPassword(password, verifierBlob) {
    try {
      const key = await this.deriveKeyFromPassword(password);
      const decrypted = await this.decryptWithKey(verifierBlob, key);
      return decrypted === CANARY_STRING;
    } catch {
      return false;
    }
  }

  // ─── Encrypt / Decrypt ─────────────────────────────────────

  /**
   * Encrypts text using a CryptoKey (preferred) or a password string (legacy).
   * Each call generates a fresh random IV prepended to the ciphertext.
   * @param {string} text
   * @param {CryptoKey|string} keyOrPassword
   * @returns {Promise<string>} base64-encoded (IV + ciphertext)
   */
  static async encrypt(text, keyOrPassword) {
    if (!text) return text;
    if (typeof keyOrPassword === 'string') {
      // Legacy path: derive key from password (kept for backward compat)
      const key = await this.deriveKeyFromPassword(keyOrPassword);
      return this.encryptWithKey(text, key);
    }
    return this.encryptWithKey(text, keyOrPassword);
  }

  /**
   * Decrypts text using a CryptoKey (preferred) or a password string (legacy).
   * @param {string} encryptedBase64
   * @param {CryptoKey|string} keyOrPassword
   * @returns {Promise<string|null>}
   */
  static async decrypt(encryptedBase64, keyOrPassword) {
    if (!encryptedBase64 || typeof encryptedBase64 !== 'string') return encryptedBase64;
    if (typeof keyOrPassword === 'string') {
      const key = await this.deriveKeyFromPassword(keyOrPassword);
      return this.decryptWithKey(encryptedBase64, key);
    }
    return this.decryptWithKey(encryptedBase64, keyOrPassword);
  }

  // ─── Internal: CryptoKey-based encrypt/decrypt ─────────────

  /**
   * @param {string} text
   * @param {CryptoKey} key
   * @returns {Promise<string>} base64-encoded (IV + ciphertext)
   */
  static async encryptWithKey(text, key) {
    if (!text) return text;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_SIZE));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * @param {string} encryptedBase64
   * @param {CryptoKey} key
   * @returns {Promise<string|null>}
   */
  static async decryptWithKey(encryptedBase64, key) {
    if (!encryptedBase64 || typeof encryptedBase64 !== 'string') return encryptedBase64;

    try {
      const combined = new Uint8Array(
        atob(encryptedBase64)
          .split('')
          .map((c) => c.charCodeAt(0))
      );

      const iv = combined.slice(0, IV_SIZE);
      const data = combined.slice(IV_SIZE);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error('Decryption failed', e);
      return null;
    }
  }
}
