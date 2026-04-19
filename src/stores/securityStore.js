import { create } from 'zustand';

export const useSecurityStore = create((set) => ({
  derivedKey: null,     // CryptoKey handle — never a plaintext password
  isLocked: true,
  isInitialized: false, // Whether a master password has been set ever

  initialize: (hasPassword) => set({ isInitialized: hasPassword }),
  
  /**
   * Called after password verification succeeds. Receives the opaque
   * CryptoKey derived via SecurityService.deriveKeyFromPassword().
   * The plaintext password is never stored here.
   */
  unlock: (key) => set({ derivedKey: key, isLocked: false }),
  
  lock: () => set({ derivedKey: null, isLocked: true }),
  
  setInitialized: (val) => set({ isInitialized: val }),
}));
