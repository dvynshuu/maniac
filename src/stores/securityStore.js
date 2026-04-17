import { create } from 'zustand';

export const useSecurityStore = create((set) => ({
  masterPassword: null,
  isLocked: true,
  isInitialized: false, // Whether a master password has been set ever

  initialize: (hasPassword) => set({ isInitialized: hasPassword }),
  
  unlock: (password) => set({ masterPassword: password, isLocked: false }),
  
  lock: () => set({ masterPassword: null, isLocked: true }),
  
  setInitialized: (val) => set({ isInitialized: val }),
}));
