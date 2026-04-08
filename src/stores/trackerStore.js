import { create } from 'zustand';
import { db } from '../db/database';
import { createTracker, createTrackerEntry, createTrackerField } from '../utils/helpers';

export const useTrackerStore = create((set, get) => ({
  trackers: [],
  currentTrackerId: null,
  entries: [],

  loadTrackers: async () => {
    const trackers = await db.trackers.toArray();
    set({ trackers });
  },

  loadEntries: async (trackerId) => {
    if (!trackerId) {
      set({ entries: [] });
      return;
    }
    const entries = await db.tracker_entries
      .where('trackerId')
      .equals(trackerId)
      .reverse()
      .sortBy('createdAt');
    set({ entries, currentTrackerId: trackerId });
  },

  addTracker: async (overrides = {}) => {
    const tracker = createTracker(overrides);
    await db.trackers.add(tracker);
    await get().loadTrackers();
    return tracker;
  },

  updateTracker: async (id, updates) => {
    await db.trackers.update(id, { ...updates, updatedAt: Date.now() });
    await get().loadTrackers();
  },

  deleteTracker: async (id) => {
    await db.tracker_entries.where('trackerId').equals(id).delete();
    await db.trackers.delete(id);
    await get().loadTrackers();
  },

  addField: async (trackerId, fieldOverrides = {}) => {
    const tracker = await db.trackers.get(trackerId);
    if (!tracker) return;
    const field = createTrackerField(fieldOverrides);
    const fields = [...tracker.fields, field];
    await db.trackers.update(trackerId, { fields, updatedAt: Date.now() });
    await get().loadTrackers();
    return field;
  },

  updateField: async (trackerId, fieldId, updates) => {
    const tracker = await db.trackers.get(trackerId);
    if (!tracker) return;
    const fields = tracker.fields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    await db.trackers.update(trackerId, { fields, updatedAt: Date.now() });
    await get().loadTrackers();
  },

  deleteField: async (trackerId, fieldId) => {
    const tracker = await db.trackers.get(trackerId);
    if (!tracker) return;
    const fields = tracker.fields.filter((f) => f.id !== fieldId);
    await db.trackers.update(trackerId, { fields, updatedAt: Date.now() });
    await get().loadTrackers();
  },

  addEntry: async (trackerId, data = {}) => {
    const entry = createTrackerEntry(trackerId, data);
    await db.tracker_entries.add(entry);
    await get().loadEntries(trackerId);
    return entry;
  },

  updateEntry: async (entryId, data) => {
    const entry = await db.tracker_entries.get(entryId);
    if (!entry) return;
    await db.tracker_entries.update(entryId, {
      data: { ...entry.data, ...data },
      updatedAt: Date.now(),
    });
    await get().loadEntries(entry.trackerId);
  },

  deleteEntry: async (entryId) => {
    const entry = await db.tracker_entries.get(entryId);
    if (!entry) return;
    const trackerId = entry.trackerId;
    await db.tracker_entries.delete(entryId);
    await get().loadEntries(trackerId);
  },
}));
