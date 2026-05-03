import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Settings Store — Persisted user preferences for the Maniac OS workspace.
 * All settings survive page reloads via localStorage.
 */
export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // ─── Appearance ─────────────────────────────────
      theme: 'dark',               // 'dark' | 'light' | 'system'
      animationsEnabled: true,
      fontFamily: 'Inter',         // 'Inter' | 'JetBrains Mono' | 'System'
      fontSize: 'default',        // 'compact' | 'default' | 'comfortable'
      accentColor: '#2E5BFF',     // hex color for accent

      // ─── System ──────────────────────────────────────
      startupPage: 'dashboard',   // 'dashboard' | 'last-visited'
      spellCheck: true,
      autoSaveInterval: 2,        // seconds (1-10)
      developerMode: false,
      reducedMotion: false,

      // ─── Security ────────────────────────────────────
      autoLockEnabled: false,
      autoLockTimeout: 5,         // minutes
      lockOnClose: true,

      // ─── Notifications ──────────────────────────────
      notificationsEnabled: true,
      soundEnabled: false,
      stalePageAlerts: true,
      stalePageThresholdDays: 14,

      // ─── Setters ─────────────────────────────────────
      setSetting: (key, value) => set({ [key]: value }),
      
      toggleSetting: (key) => set(s => ({ [key]: !s[key] })),

      resetToDefaults: () => set({
        theme: 'dark',
        animationsEnabled: true,
        fontFamily: 'Inter',
        fontSize: 'default',
        accentColor: '#2E5BFF',
        startupPage: 'dashboard',
        spellCheck: true,
        autoSaveInterval: 2,
        developerMode: false,
        reducedMotion: false,
        autoLockEnabled: false,
        autoLockTimeout: 5,
        lockOnClose: true,
        notificationsEnabled: true,
        soundEnabled: false,
        stalePageAlerts: true,
        stalePageThresholdDays: 14,
      }),
    }),
    {
      name: 'maniac-settings',
    }
  )
);
