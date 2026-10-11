export interface CipherData {
  ciphertext: string;
  iv: string;
  salt?: string;
  version?: number;
}

export interface SecurityState {
  isLocked: boolean;
  derivedKey: CryptoKey | null;
  hasPassphrase: boolean;
  autoLockMinutes: number;
}
