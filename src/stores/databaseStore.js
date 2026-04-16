import { create } from 'zustand';
import { useBlockStore } from './blockStore';
import { createProperty, createDatabaseRow, createId, debounce } from '../utils/helpers';

export const useDatabaseStore = create((set, get) => ({
  // Local cache of database state for instant UI updates
  // Structure: { [blockId]: { schema, rows, initialized: true } }
  databases: {},

  // Initializes local state from block properties
  initializeDatabase: (blockId, schema, rows) => {
    // Only initialize if not already present or force update
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
    
    // Update local immediately then Dexie
    get()._updateLocal(blockId, { schema: newSchema, rows: updatedRows });
    await get()._immediateSave(blockId, { schema: newSchema, rows: updatedRows });
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
    await get()._immediateSave(blockId, { schema: newSchema, rows: updatedRows });
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
    const newRow = createDatabaseRow(schema, overrides);
    const newRows = [...rows, newRow];
    
    get()._updateLocal(blockId, { rows: newRows });
    await get()._immediateSave(blockId, { rows: newRows });
    return newRow;
  },

  updateCell: (blockId, rowId, propertyId, value) => {
    const { rows } = get().getDatabaseData(blockId);
    const newRows = rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          updatedAt: Date.now(),
          values: { ...row.values, [propertyId]: value }
        };
      }
      return row;
    });

    // Update local immediately for 0ms lag
    get()._updateLocal(blockId, { rows: newRows });
    
    // Background save
    get()._saveToBlockStore(blockId, { rows: newRows });
  },
  
  updateCellImmediate: async (blockId, rowId, propertyId, value) => {
      const { rows } = get().getDatabaseData(blockId);
      const newRows = rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            updatedAt: Date.now(),
            values: { ...row.values, [propertyId]: value }
          };
        }
        return row;
      });
      
      get()._updateLocal(blockId, { rows: newRows });
      await get()._immediateSave(blockId, { rows: newRows });
  },

  deleteRow: async (blockId, rowId) => {
    const { rows } = get().getDatabaseData(blockId);
    const newRows = rows.filter(r => r.id !== rowId);
    
    get()._updateLocal(blockId, { rows: newRows });
    await get()._immediateSave(blockId, { rows: newRows });
  },

  duplicateRow: async (blockId, rowId) => {
    const { schema, rows } = get().getDatabaseData(blockId);
    const rowToDuplicate = rows.find(r => r.id === rowId);
    if (!rowToDuplicate) return;

    const newRow = {
      ...rowToDuplicate,
      id: createId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const index = rows.findIndex(r => r.id === rowId);
    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    
    get()._updateLocal(blockId, { rows: newRows });
    await get()._immediateSave(blockId, { rows: newRows });
  }
}));
