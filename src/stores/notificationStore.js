import { create } from 'zustand';
import { db } from '../db/database';
import { useUIStore } from './uiStore';
import { nanoid } from 'nanoid';

export const useNotificationStore = create((set, get) => ({
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
        
        const seedData = [
          {
            id: 'system-optimized',
            type: 'system',
            title: 'System Optimized',
            desc: 'Garbage collection reclaimed 12MB of local storage.',
            isRead: 0,
            createdAt: now - 120000 // 2m ago
          },
          {
            id: 'vault-synced',
            type: 'security',
            title: 'Vault Synced',
            desc: 'Latest changes securely encrypted and stored.',
            isRead: 0,
            createdAt: now - 3600000 // 1h ago
          },
          {
            id: 'auto-archive',
            type: 'info',
            title: 'Auto-Archive',
            desc: '5 stale nodes moved to archives.',
            isRead: 0,
            createdAt: now - 3600000 * 24 // 1d ago
          }
        ];
        
        await db.notifications.bulkAdd(seedData);
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

  addNotification: async (title, desc, type = 'info') => {
    try {
      const now = Date.now();
      const newNotification = {
        id: nanoid(),
        type,
        title,
        desc,
        isRead: 0,
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

  markAsRead: async (id) => {
    try {
      set(s => {
        const updated = s.notifications.map(n => n.id === id ? { ...n, isRead: 1 } : n);
        return {
          notifications: updated,
          unreadCount: updated.filter(n => !n.isRead).length
        };
      });
      await db.notifications.update(id, { isRead: 1 });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      set(s => {
        const updated = s.notifications.map(n => ({ ...n, isRead: 1 }));
        return {
          notifications: updated,
          unreadCount: 0
        };
      });
      
      // Mark all in DB
      await db.notifications.toCollection().modify({ isRead: 1 });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  deleteNotification: async (id) => {
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
