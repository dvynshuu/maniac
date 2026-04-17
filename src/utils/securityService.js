/**
 * Security Service for database encryption using Web Crypto API.
 * Uses PBKDF2 for key derivation and AES-GCM for encryption.
 */

const ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

export class SecurityService {
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

  static async encrypt(text, password) {
    if (!text) return text;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const key = await this.deriveKey(password, salt);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(encryptedBase64, password) {
    if (!encryptedBase64 || typeof encryptedBase64 !== 'string') return encryptedBase64;
    
    try {
      const combined = new Uint8Array(
        atob(encryptedBase64)
          .split('')
          .map((c) => c.charCodeAt(0))
      );

      const salt = combined.slice(0, SALT_SIZE);
      const iv = combined.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
      const data = combined.slice(SALT_SIZE + IV_SIZE);

      const key = await this.deriveKey(password, salt);
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
