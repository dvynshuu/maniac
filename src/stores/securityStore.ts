import { create } from 'zustand';

export interface SecurityStore {
  derivedKey: CryptoKey | null;
  hmacKey: CryptoKey | null;
  isLocked: boolean;
  isInitialized: boolean;

  initialize: (hasPassword: boolean) => void;
  unlock: (keys: { aesKey?: CryptoKey; hmacKey?: CryptoKey } | any) => void;
  lock: () => void;
  setInitialized: (val: boolean) => void;
}

export const useSecurityStore = create<SecurityStore>((set) => ({
  derivedKey: null,     // CryptoKey handle (AES)
  hmacKey: null,        // CryptoKey handle (HMAC)
  isLocked: true,
  isInitialized: false,

  initialize: (hasPassword) => set({ isInitialized: hasPassword }),
  
  unlock: (keys) => set({ 
    derivedKey: (keys && keys.aesKey) ? keys.aesKey : keys, 
    hmacKey: (keys && keys.hmacKey) ? keys.hmacKey : null, 
    isLocked: false 
  }),
  
  lock: () => set({ derivedKey: null, hmacKey: null, isLocked: true }),
  
  setInitialized: (val) => set({ isInitialized: val }),
}));
