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
    if (get().databases[blockId]?.initialized || get().databases[blockId]?.loading) return;

    // Mark as loading to prevent concurrent calls
    set(state => ({
      databases: {
        ...state.databases,
        [blockId]: { ...state.databases[blockId], loading: true }
      }
    }));

    try {
      if (legacyRows && legacyRows.length > 0) {
        const rowsToInsert = legacyRows.map(r => ({ ...r, blockId }));
        await db.database_rows.bulkPut(rowsToInsert);
        
        const block = useBlockStore.getState().getBlock(blockId);
        if (block) {
          const newProps = { ...block.properties };
          delete newProps.rows;
          await useBlockStore.getState().updateBlock(blockId, { properties: newProps });
        }
      }

      const rowsRaw = await db.database_rows.where('blockId').equals(blockId).sortBy('createdAt');
      const cellsRaw = await db.database_cells.where('blockId').equals(blockId).toArray();
      
      const key = useSecurityStore.getState().derivedKey;
      
      const cellsByRow = {};
      for (const cell of cellsRaw) {
          if (!cellsByRow[cell.rowId]) cellsByRow[cell.rowId] = {};
          let val = cell.value;
          if (key && cell._isEncrypted && typeof val === 'string') {
              try { val = JSON.parse(await SecurityService.decrypt(val, key)); } catch { val = ''; }
          }
          cellsByRow[cell.rowId][cell.propertyId] = val;
      }

      const rows = await Promise.all(rowsRaw.map(async r => {
         let values = cellsByRow[r.id] || {};
         
         if (r.values !== undefined) {
             let oldVals = r.values;
             if (key && r._isEncrypted && typeof oldVals === 'string') {
                 try { oldVals = JSON.parse(await SecurityService.decrypt(oldVals, key)); } catch { oldVals = {}; }
             }
             if (typeof oldVals === 'object' && oldVals !== null) {
                 values = { ...values, ...oldVals };
                 const cellsToInsert = Object.entries(oldVals).map(([propId, val]) => ({
                     id: `${r.id}_${propId}`, rowId: r.id, blockId, propertyId: propId, value: val, createdAt: Date.now(), updatedAt: Date.now()
                 }));
                 if (cellsToInsert.length > 0) await db.database_cells.bulkPut(cellsToInsert);
             }
             delete r.values;
             delete r._isEncrypted;
             await db.database_rows.put(r);
         }
         return { ...r, values };
      }));

      set(state => ({
        databases: {
          ...state.databases,
          [blockId]: { schema, rows, initialized: true, lastUpdate: Date.now() }
        }
      }));
    } catch (error) {
      console.error('[databaseStore] Failed to initialize database:', error);
      set(state => ({
        databases: {
          ...state.databases,
          [blockId]: { ...state.databases[blockId], loading: false }
        }
      }));
    }
  },

  // Helper to get current database state (local first, then blockStore fallback)
  getDatabaseData: (blockId) => {
    const local = get().databases[blockId];
    // If we have local data (even if just from an addRow call), prefer it
    if (local && (local.initialized || local.rows)) return { schema: local.schema, rows: local.rows };

    const block = useBlockStore.getState().getBlock(blockId);
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
        const block = useBlockStore.getState().getBlock(id);
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
    const block = useBlockStore.getState().getBlock(blockId);
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
        [blockId]: { 
          ...current, 
          ...updates, 
          initialized: state.databases[blockId]?.initialized || !!updates.rows || !!updates.schema,
          lastUpdate: Date.now() 
        }
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
    const cellsToInsert = updatedRows.map(r => ({
      id: `${r.id}_${newProp.id}`, rowId: r.id, blockId, propertyId: newProp.id, value: newProp.type === 'checkbox' ? false : '', createdAt: Date.now(), updatedAt: Date.now()
    }));
    if (cellsToInsert.length > 0) await db.database_cells.bulkPut(cellsToInsert);
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
    
    await db.database_cells.where('propertyId').equals(propertyId).delete();
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
    try {
      const { schema, rows } = get().getDatabaseData(blockId);
      const newRow = createDatabaseRow(schema, { ...overrides, blockId });
      const newRows = [...rows, newRow];
      
      // Update local state immediately for snappy UI
      get()._updateLocal(blockId, { rows: newRows });
      
      // Background persistence
      const cellsToInsert = Object.entries(newRow.values).map(([propId, value]) => ({
         id: `${newRow.id}_${propId}`, 
         rowId: newRow.id, 
         blockId, 
         propertyId: propId, 
         value, 
         createdAt: Date.now(), 
         updatedAt: Date.now()
      }));
      
      const rowToInsert = { ...newRow };
      delete rowToInsert.values;
      
      // We use a transaction to ensure atomic insert in Dexie
      await db.transaction('rw', [db.database_rows, db.database_cells], async () => {
        await db.database_rows.add(rowToInsert);
        if (cellsToInsert.length > 0) {
          await db.database_cells.bulkAdd(cellsToInsert);
        }
      });
      
      return newRow;
    } catch (error) {
      console.error('[databaseStore] Failed to add row:', error);
      throw error; 
    }
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
      db.database_cells.put({ id: `${rowId}_${propertyId}`, rowId, blockId, propertyId, value, createdAt: Date.now(), updatedAt: updatedRow.updatedAt });
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
        await db.database_cells.put({ id: `${rowId}_${propertyId}`, rowId, blockId, propertyId, value, createdAt: Date.now(), updatedAt: updatedRow.updatedAt });
      }
  },

  deleteRow: async (blockId, rowId) => {
    const { rows } = get().getDatabaseData(blockId);
    const newRows = rows.filter(r => r.id !== rowId);
    
    get()._updateLocal(blockId, { rows: newRows });
    await db.database_rows.delete(rowId);
    await db.database_cells.where('rowId').equals(rowId).delete();
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
    
    const cellsToInsert = Object.entries(newRow.values).map(([propId, value]) => ({
       id: `${newRow.id}_${propId}`, rowId: newRow.id, blockId, propertyId: propId, value, createdAt: Date.now(), updatedAt: Date.now()
    }));
    const rowToInsert = { ...newRow };
    delete rowToInsert.values;
    
    await db.database_rows.add(rowToInsert);
    if (cellsToInsert.length > 0) await db.database_cells.bulkAdd(cellsToInsert);
  }
}));
