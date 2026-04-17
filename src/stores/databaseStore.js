import { create } from 'zustand';
import { db } from '../db/database';
import { useBlockStore } from './blockStore';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from './securityStore';
import { createProperty, createDatabaseRow, createId, debounce } from '../utils/helpers';

export const useDatabaseStore = create((set, get) => ({
  // Local cache of database state for instant UI updates
  // Structure: { [blockId]: { schema, rows, initialized: true } }
  databases: {},

  // Initializes local state from block properties
  initializeDatabase: async (blockId, schema, legacyRows) => {
    if (get().databases[blockId]?.initialized) return;

    if (legacyRows && legacyRows.length > 0) {
      const rowsToInsert = legacyRows.map(r => ({ ...r, blockId }));
      await db.database_rows.bulkPut(rowsToInsert);
      
      const block = useBlockStore.getState().blocks.find(b => b.id === blockId);
      if (block) {
        const newProps = { ...block.properties };
        delete newProps.rows;
        await useBlockStore.getState().updateBlock(blockId, { properties: newProps });
      }
    }

    const rowsRaw = await db.database_rows.where('blockId').equals(blockId).sortBy('createdAt');
    const password = useSecurityStore.getState().masterPassword;
    
    const rows = await Promise.all(rowsRaw.map(async r => {
       if (password && r._isEncrypted && typeof r.values === 'string') {
           const decrypted = await SecurityService.decrypt(r.values, password);
           try {
             return { ...r, values: JSON.parse(decrypted) };
           } catch {
             return { ...r, values: {} };
           }
       }
       return r;
    }));

    set(state => ({
      databases: {
        ...state.databases,
        [blockId]: { schema, rows, initialized: true, lastUpdate: Date.now() }
      }
    }));
  },

  // Helper to get current database state (local first, then blockStore fallback)
  getDatabaseData: (blockId) => {
    const local = get().databases[blockId];
    if (local && local.initialized) return { schema: local.schema, rows: local.rows };

    const block = useBlockStore.getState().blocks.find(b => b.id === blockId);
    if (!block || !block.properties) return { schema: [], rows: [] };
    
    return {
      schema: block.properties.schema || [],
      rows: block.properties.rows || [],
    };
  },

  // Internal save function that debounces writes to blockStore
  debouncedSaves: {},
  
  _saveToBlockStore: (blockId, updates) => {
    // This now only handles schema updates
    const state = get();
    if (!state.debouncedSaves[blockId]) {
      state.debouncedSaves[blockId] = debounce((id, data) => {
        const block = useBlockStore.getState().blocks.find(b => b.id === id);
        if (block) {
          useBlockStore.getState().updateBlock(id, {
            properties: { ...block.properties, ...data }
          });
        }
      }, 500);
    }
    state.debouncedSaves[blockId](blockId, updates);
  },

  // Immediate save for structural changes to Dexie (via blockStore)
  _immediateSave: async (blockId, updates) => {
    const block = useBlockStore.getState().blocks.find(b => b.id === blockId);
    if (block) {
      await useBlockStore.getState().updateBlock(blockId, {
        properties: { ...block.properties, ...updates }
      });
    }
  },

  // Updates local store immediately
  _updateLocal: (blockId, updates) => {
    const current = get().getDatabaseData(blockId);
    set(state => ({
      databases: {
        ...state.databases,
        [blockId]: { ...current, ...updates, lastUpdate: Date.now() }
      }
    }));
  },

  // ---- Schema Operations ----

  addProperty: async (blockId, overrides = {}) => {
    const { schema, rows } = get().getDatabaseData(blockId);
    const newProp = createProperty(overrides);
    
    const updatedRows = rows.map(row => ({
      ...row,
      values: { ...row.values, [newProp.id]: newProp.type === 'checkbox' ? false : '' }
    }));

    const newSchema = [...schema, newProp];
    
    get()._updateLocal(blockId, { schema: newSchema, rows: updatedRows });
    await get()._immediateSave(blockId, { schema: newSchema });
    
    // Update all rows in Dexie concurrently
    await Promise.all(updatedRows.map(r => db.database_rows.update(r.id, { values: r.values })));
    return newProp;
  },

  updateProperty: async (blockId, propertyId, updates) => {
    const { schema } = get().getDatabaseData(blockId);
    const newSchema = schema.map(p => p.id === propertyId ? { ...p, ...updates } : p);
    
    get()._updateLocal(blockId, { schema: newSchema });
    await get()._immediateSave(blockId, { schema: newSchema });
  },

  deleteProperty: async (blockId, propertyId) => {
    const { schema, rows } = get().getDatabaseData(blockId);
    const newSchema = schema.filter(p => p.id !== propertyId);
    
    const updatedRows = rows.map(row => {
      const newValues = { ...row.values };
      delete newValues[propertyId];
      return { ...row, values: newValues };
    });

    get()._updateLocal(blockId, { schema: newSchema, rows: updatedRows });
    await get()._immediateSave(blockId, { schema: newSchema });
    
    await Promise.all(updatedRows.map(r => db.database_rows.update(r.id, { values: r.values })));
  },

  reorderProperties: async (blockId, sourceIndex, destinationIndex) => {
     const { schema } = get().getDatabaseData(blockId);
     const newSchema = [...schema];
     const [removed] = newSchema.splice(sourceIndex, 1);
     newSchema.splice(destinationIndex, 0, removed);
     
     get()._updateLocal(blockId, { schema: newSchema });
     await get()._immediateSave(blockId, { schema: newSchema });
  },


  // ---- Row Operations ----

  addRow: async (blockId, overrides = {}) => {
    const { schema, rows } = get().getDatabaseData(blockId);
    const newRow = createDatabaseRow(schema, { ...overrides, blockId });
    const newRows = [...rows, newRow];
    
    get()._updateLocal(blockId, { rows: newRows });
    await db.database_rows.add(newRow);
    return newRow;
  },

  updateCell: (blockId, rowId, propertyId, value) => {
    const { rows } = get().getDatabaseData(blockId);
    let updatedRow = null;
    const newRows = rows.map(row => {
      if (row.id === rowId) {
        updatedRow = {
          ...row,
          updatedAt: Date.now(),
          values: { ...row.values, [propertyId]: value }
        };
        return updatedRow;
      }
      return row;
    });

    get()._updateLocal(blockId, { rows: newRows });
    
    // Background save to isolated table
    if (updatedRow) {
      db.database_rows.update(rowId, { values: updatedRow.values, updatedAt: updatedRow.updatedAt });
    }
  },
  
  updateCellImmediate: async (blockId, rowId, propertyId, value) => {
      const { rows } = get().getDatabaseData(blockId);
      let updatedRow = null;
      const newRows = rows.map(row => {
        if (row.id === rowId) {
          updatedRow = {
            ...row,
            updatedAt: Date.now(),
            values: { ...row.values, [propertyId]: value }
          };
          return updatedRow;
        }
        return row;
      });
      
      get()._updateLocal(blockId, { rows: newRows });
      if (updatedRow) {
        await db.database_rows.update(rowId, { values: updatedRow.values, updatedAt: updatedRow.updatedAt });
      }
  },

  deleteRow: async (blockId, rowId) => {
    const { rows } = get().getDatabaseData(blockId);
    const newRows = rows.filter(r => r.id !== rowId);
    
    get()._updateLocal(blockId, { rows: newRows });
    await db.database_rows.delete(rowId);
  },

  duplicateRow: async (blockId, rowId) => {
    const { schema, rows } = get().getDatabaseData(blockId);
    const rowToDuplicate = rows.find(r => r.id === rowId);
    if (!rowToDuplicate) return;

    const newRow = {
      ...rowToDuplicate,
      id: createId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      blockId // Ensure blockId is set correctly
    };
    
    const index = rows.findIndex(r => r.id === rowId);
    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    
    get()._updateLocal(blockId, { rows: newRows });
    await db.database_rows.add(newRow);
  }
}));
