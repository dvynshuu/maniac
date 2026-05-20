import React, { useState, useRef, useEffect } from 'react';
import { PROPERTY_TYPES, PROPERTY_TYPE_META } from '../../utils/constants';
import { useDatabaseStore } from '../../stores/databaseStore';
import { db } from '../../db/database';
import * as Icons from 'lucide-react';
import { Trash2, Type, Hash, Tag, Tags, Calendar, CheckSquare, Link, Mail, Phone, Clock, ChevronRight } from 'lucide-react';

const ROLLUP_CALCULATIONS = [
  { value: 'show_original', label: 'Show original' },
  { value: 'count_all', label: 'Count all' },
  { value: 'count_unique', label: 'Count unique' },
  { value: 'count_empty', label: 'Count empty' },
  { value: 'count_not_empty', label: 'Count not empty' },
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

export default function ColumnMenu({ property, blockId, position, onClose }) {
  const [isChangingType, setIsChangingType] = useState(false);
  const menuRef = useRef(null);
  const updateProperty = useDatabaseStore(s => s.updateProperty);
  const deleteProperty = useDatabaseStore(s => s.deleteProperty);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const [dbBlocks, setDbBlocks] = useState([]);
  const [targetSchema, setTargetSchema] = useState([]);

  useEffect(() => {
    db.blocks.where('type').equals('database').toArray().then(async (blocks) => {
      const blocksWithTitles = await Promise.all(blocks.map(async (b) => {
        const page = await db.pages.get(b.pageId);
        const name = b.properties?.name || page?.title || 'Untitled Database';
        return { id: b.id, name: `${name} (in ${page?.title || 'Untitled Page'})` };
      }));
      setDbBlocks(blocksWithTitles.filter(d => d.id !== blockId));
    }).catch(err => console.error('Failed to load database blocks:', err));
  }, [blockId]);

  const relationPropertyId = property.config?.relationPropertyId;
  useEffect(() => {
    if (property.type !== PROPERTY_TYPES.ROLLUP || !relationPropertyId) {
      setTargetSchema([]);
      return;
    }
    const currentSchema = useDatabaseStore.getState().getDatabaseData(blockId)?.schema || [];
    const relProp = currentSchema.find(p => p.id === relationPropertyId);
    const targetDbId = relProp?.config?.relatedDatabaseId;
    if (!targetDbId) {
      setTargetSchema([]);
      return;
    }
    
    const cachedDb = useDatabaseStore.getState().databases[targetDbId];
    if (cachedDb?.schema) {
      setTargetSchema(cachedDb.schema);
    } else {
      db.blocks.get(targetDbId).then(targetBlock => {
        setTargetSchema(targetBlock?.properties?.schema || []);
      }).catch(err => console.error('Failed to load target database schema:', err));
    }
  }, [property.type, relationPropertyId, blockId]);

  const currentSchema = useDatabaseStore.getState().getDatabaseData(blockId)?.schema || [];
  const relationProperties = currentSchema.filter(p => p.type === PROPERTY_TYPES.RELATION);

  const handleRename = (e) => {
    updateProperty(blockId, property.id, { name: e.target.value });
  };

  const handleChangeType = (newType) => {
    updateProperty(blockId, property.id, { type: newType, config: {} });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete property "${property.name}"? This will also delete data in this column.`)) {
      deleteProperty(blockId, property.id);
      onClose();
    }
  };

  return (
    <div 
      className="db-column-menu" 
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
    >
      {!isChangingType ? (
        <div style={{ padding: '6px' }}>
          <div style={{ padding: '4px' }}>
            <input 
              autoFocus
              className="db-menu-input"
              value={property.name}
              onChange={handleRename}
              placeholder="Property name"
            />
          </div>

          <div className="db-menu-divider" />

          <button className="db-menu-item" onClick={() => setIsChangingType(true)}>
            <div className="db-type-icon-wrapper" style={{ width: '20px', height: '20px', background: 'transparent' }}>
              <Type size={14} />
            </div>
            <span>Type</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.6 }}>
              <span style={{ fontSize: '12px' }}>{PROPERTY_TYPE_META[property.type].label}</span>
              <ChevronRight size={14} />
            </div>
          </button>

          {(property.type === PROPERTY_TYPES.RELATION || property.type === PROPERTY_TYPES.ROLLUP) && (
            <div className="db-menu-divider" />
          )}

          {property.type === PROPERTY_TYPES.RELATION && (
            <div style={{ padding: '8px' }}>
              <label className="db-field-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Connect to Database
              </label>
              <select 
                className="db-menu-select"
                value={property.config?.relatedDatabaseId || ''}
                onChange={(e) => {
                  updateProperty(blockId, property.id, {
                    config: { ...property.config, relatedDatabaseId: e.target.value }
                  });
                }}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  padding: '4px 6px'
                }}
              >
                <option value="">Select a database...</option>
                {dbBlocks.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {property.type === PROPERTY_TYPES.ROLLUP && (
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label className="db-field-label" style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Relation Property
                </label>
                <select 
                  className="db-menu-select"
                  value={property.config?.relationPropertyId || ''}
                  onChange={(e) => {
                    updateProperty(blockId, property.id, {
                      config: { ...property.config, relationPropertyId: e.target.value, targetPropertyId: '' }
                    });
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    padding: '4px 6px'
                  }}
                >
                  <option value="">Select relation...</option>
                  {relationProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="db-field-label" style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Target Property
                </label>
                <select 
                  className="db-menu-select"
                  value={property.config?.targetPropertyId || ''}
                  onChange={(e) => {
                    updateProperty(blockId, property.id, {
                      config: { ...property.config, targetPropertyId: e.target.value }
                    });
                  }}
                  disabled={!property.config?.relationPropertyId}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    padding: '4px 6px'
                  }}
                >
                  <option value="">Select target column...</option>
                  {targetSchema.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="db-field-label" style={{ display: 'block', marginBottom: '2px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Calculate
                </label>
                <select 
                  className="db-menu-select"
                  value={property.config?.calculate || 'show_original'}
                  onChange={(e) => {
                    updateProperty(blockId, property.id, {
                      config: { ...property.config, calculate: e.target.value }
                    });
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    padding: '4px 6px'
                  }}
                >
                  {ROLLUP_CALCULATIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="db-menu-divider" />

          <button className="db-menu-item text-error" onClick={handleDelete}>
            <div className="db-type-icon-wrapper" style={{ width: '20px', height: '20px', background: 'transparent', color: 'inherit' }}>
              <Trash2 size={14} />
            </div>
            <span>Delete Property</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="db-popover-header">
            <button className="db-popover-close" onClick={() => setIsChangingType(false)} style={{ padding: '2px' }}>
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <span className="db-popover-title">Property Type</span>
            <div style={{ width: '20px' }} />
          </div>
          <div className="db-type-selector">
            {Object.entries(PROPERTY_TYPES).map(([key, type]) => {
              const meta = PROPERTY_TYPE_META[type];
              const Icon = Icons[meta.icon] || Type;
              const isSelected = property.type === type;
              return (
                <button 
                  key={type}
                  className={`db-type-option ${isSelected ? 'active' : ''}`}
                  onClick={() => handleChangeType(type)}
                >
                  <div className="db-type-icon-wrapper">
                    <Icon size={14} />
                  </div>
                  <span className="db-type-label">{meta.label}</span>
                  {isSelected && <div className="db-type-active-indicator" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
