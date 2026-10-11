import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityService } from '../utils/securityService';

describe('SecurityService (E2E Encryption & Web Crypto)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Key derivation & Salt', () => {
    it('generates and persists a stable master salt', () => {
      const salt1 = SecurityService.getMasterSalt();
      expect(salt1).toBeInstanceOf(Uint8Array);
      expect(salt1.length).toBe(16);

      const salt2 = SecurityService.getMasterSalt();
      expect(salt2).toEqual(salt1);
    });

    it('derives AES-GCM and HMAC CryptoKeys from a passphrase', async () => {
      const salt = SecurityService.getMasterSalt();
      const keys = await SecurityService.deriveKeys('my-secret-passphrase', salt);

      expect(keys.aesKey).toBeDefined();
      expect(keys.aesKey.algorithm.name).toBe('AES-GCM');
      expect(keys.hmacKey).toBeDefined();
      expect(keys.hmacKey.algorithm.name).toBe('HMAC');
    });
  });

  describe('Encryption & Decryption (AES-GCM 256)', () => {
    it('encrypts plaintext into menc: prefixed base64 and decrypts back', async () => {
      const { aesKey } = await SecurityService.deriveKeysFromPassword('vault-password-123');
      const plaintext = 'Sensitive architectural secrets for MANIAC local-first engine';

      const encrypted = await SecurityService.encryptWithKey(plaintext, aesKey);
      expect(encrypted.startsWith('menc:')).toBe(true);
      expect(SecurityService.isEncrypted(encrypted)).toBe(true);

      const decrypted = await SecurityService.decryptWithKey(encrypted, aesKey);
      expect(decrypted).toBe(plaintext);
    });

    it('generates different ciphertexts for the same plaintext due to randomized IV', async () => {
      const { aesKey } = await SecurityService.deriveKeysFromPassword('vault-password-123');
      const plaintext = 'Identical input text';

      const enc1 = await SecurityService.encryptWithKey(plaintext, aesKey);
      const enc2 = await SecurityService.encryptWithKey(plaintext, aesKey);

      expect(enc1).not.toBe(enc2);

      const dec1 = await SecurityService.decryptWithKey(enc1, aesKey);
      const dec2 = await SecurityService.decryptWithKey(enc2, aesKey);
      expect(dec1).toBe(plaintext);
      expect(dec2).toBe(plaintext);
    });

    it('fails to decrypt or returns null when using an incorrect key', async () => {
      const keys1 = await SecurityService.deriveKeysFromPassword('password-A');
      const keys2 = await SecurityService.deriveKeysFromPassword('password-B');

      const encrypted = await SecurityService.encryptWithKey('Confidential note', keys1.aesKey);
      const failedDecryption = await SecurityService.decryptWithKey(encrypted, keys2.aesKey);

      expect(failedDecryption).toBeNull();
    });
  });

  describe('Canary Password Verification', () => {
    it('creates verifier and successfully verifies the correct passphrase', async () => {
      const passphrase = 'correct-horse-battery-staple';
      const verifier = await SecurityService.createVerifier(passphrase);

      expect(typeof verifier).toBe('string');
      expect(verifier.startsWith('menc:')).toBe(true);

      const isValid = await SecurityService.verifyPassword(passphrase, verifier);
      expect(isValid).toBe(true);
    });

    it('rejects an incorrect passphrase', async () => {
      const passphrase = 'correct-horse-battery-staple';
      const verifier = await SecurityService.createVerifier(passphrase);

      const isInvalid = await SecurityService.verifyPassword('wrong-password', verifier);
      expect(isInvalid).toBe(false);
    });
  });

  describe('HMAC Blind Indexing', () => {
    it('hashes words deterministically for blind searching', async () => {
      const { hmacKey } = await SecurityService.deriveKeysFromPassword('search-passphrase');

      const hash1 = await SecurityService.hmacWord('knowledge', hmacKey);
      const hash2 = await SecurityService.hmacWord('knowledge', hmacKey);
      const diffHash = await SecurityService.hmacWord('operating', hmacKey);

      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(32); // 16 bytes = 32 hex chars
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(diffHash);
    });
  });
});
