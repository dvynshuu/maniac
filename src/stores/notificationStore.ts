import { create } from 'zustand';
import { db, NotificationRecord } from '../db/database';
import { useUIStore } from './uiStore';
import { nanoid } from 'nanoid';

export interface NotificationStore {
  notifications: NotificationRecord[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  addNotification: (title: string, desc: string, type?: string) => Promise<NotificationRecord | null>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  loadNotifications: async () => {
    try {
      let items = await db.notifications.toArray();
      
      // Clear old seed data if present to force migration to mockup-accurate seeds
      const hasOldSeed = items.some(item => item.id === 'welcome-notification');
      if (hasOldSeed) {
        await db.notifications.clear();
        items = [];
      }

      // Seed if empty
      if (items.length === 0) {
        const now = Date.now();
        
        const seedData: NotificationRecord[] = [
          {
            id: 'system-optimized',
            type: 'system',
            title: 'System Optimized',
            desc: 'Garbage collection reclaimed 12MB of local storage.',
            isRead: false,
            createdAt: now - 120000 // 2m ago
          },
          {
            id: 'vault-synced',
            type: 'security',
            title: 'Vault Synced',
            desc: 'Latest changes securely encrypted and stored.',
            isRead: false,
            createdAt: now - 3600000 // 1h ago
          },
          {
            id: 'auto-archive',
            type: 'info',
            title: 'Auto-Archive',
            desc: '5 stale nodes moved to archives.',
            isRead: false,
            createdAt: now - 3600000 * 24 // 1d ago
          }
        ];
        
        await db.notifications.bulkPut(seedData);
        items = seedData;
      }
      
      // Sort by createdAt descending
      items.sort((a, b) => b.createdAt - a.createdAt);
      
      const unreadCount = items.filter(n => !n.isRead).length;
      set({ notifications: items, unreadCount });
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  },

  addNotification: async (title: string, desc: string, type: string = 'info') => {
    try {
      const now = Date.now();
      const newNotification: NotificationRecord = {
        id: nanoid(),
        type,
        title,
        desc,
        isRead: false,
        createdAt: now
      };
      
      // Optimistic state update
      set(s => {
        const updated = [newNotification, ...s.notifications];
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.isRead).length
        };
      });
      
      // Save to IndexedDB
      await db.notifications.add(newNotification);
      
      // Show screen toast
      useUIStore.getState().addToast(desc, type === 'security' ? 'info' : type);
      
      return newNotification;
    } catch (err) {
      console.error('Failed to add notification:', err);
      return null;
    }
  },

  markAsRead: async (id: string) => {
    try {
      set(s => {
        const updated = s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.isRead).length
        };
      });
      await db.notifications.update(id, { isRead: true });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      set(s => {
        const updated = s.notifications.map(n => ({ ...n, isRead: true }));
        return {
          notifications: updated,
          unreadCount: 0
        };
      });
      
      // Mark all in DB
      await db.notifications.toCollection().modify({ isRead: true });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      set(s => {
        const updated = s.notifications.filter(n => n.id !== id);
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.isRead).length
        };
      });
      await db.notifications.delete(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  },

  clearAll: async () => {
    try {
      set({ notifications: [], unreadCount: 0 });
      await db.notifications.clear();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }
}));
