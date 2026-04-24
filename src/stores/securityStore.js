import { create } from 'zustand';

export const useSecurityStore = create((set) => ({
  derivedKey: null,     // CryptoKey handle (AES)
  hmacKey: null,        // CryptoKey handle (HMAC)
  isLocked: true,
  isInitialized: false,

  initialize: (hasPassword) => set({ isInitialized: hasPassword }),
  
  unlock: (keys) => set({ 
    derivedKey: keys.aesKey || keys, 
    hmacKey: keys.hmacKey || null, 
    isLocked: false 
  }),
  
  lock: () => set({ derivedKey: null, hmacKey: null, isLocked: true }),
  
  setInitialized: (val) => set({ isInitialized: val }),
}));

