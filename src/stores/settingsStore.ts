import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsStore {
  userName: string;
  userProfileImage: string | null;
  theme: 'dark' | 'light' | 'system';
  animationsEnabled: boolean;
  fontFamily: string;
  fontSize: string;
  accentColor: string;
  startupPage: string;
  spellCheck: boolean;
  autoSaveInterval: number;
  developerMode: boolean;
  reducedMotion: boolean;
  autoLockEnabled: boolean;
  autoLockTimeout: number;
  lockOnClose: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  stalePageAlerts: boolean;
  stalePageThresholdDays: number;
  srsStreak: number;
  srsLastReviewDate: string | null;

  setSetting: (key: string, value: any) => void;
  toggleSetting: (key: string) => void;
  resetToDefaults: () => void;
  [key: string]: any;
}

/**
 * Settings Store — Persisted user preferences for the Maniac OS workspace.
 * All settings survive page reloads via localStorage.
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // ─── Profile ────────────────────────────────────
      userName: 'Maniac User',
      userProfileImage: null,      // base64 encoded string

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

      // ─── Active Recall (SRS) ─────────────────────────
      srsStreak: 0,
      srsLastReviewDate: null,

      // ─── Setters ─────────────────────────────────────
      setSetting: (key, value) => set({ [key]: value }),
      
      toggleSetting: (key) => set((s: any) => ({ [key]: !s[key] })),

      resetToDefaults: () => set({
        userName: 'Maniac User',
        userProfileImage: null,
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
        srsStreak: 0,
        srsLastReviewDate: null,
      }),
    }),
    {
      name: 'maniac-settings',
    }
  )
);
