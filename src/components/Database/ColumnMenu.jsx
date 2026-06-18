import React, { useState, useRef, useEffect } from 'react';
import { PROPERTY_TYPES, PROPERTY_TYPE_META } from '../../utils/constants';
import { useDatabaseStore } from '../../stores/databaseStore';
import { useBlockStore } from '../../stores/blockStore';
import { db } from '../../db/database';
import { createId } from '../../utils/helpers';
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

          {/* Progress / Number Visualization Panel */}
          {(property.type === PROPERTY_TYPES.NUMBER || property.type === PROPERTY_TYPES.ROLLUP || property.type === PROPERTY_TYPES.FORMULA) && (
            <>
              <div className="db-menu-divider" />
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Format & Visuals</div>
                
                {/* Number Format */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Number format</span>
                  <select
                    className="db-menu-select"
                    value={property.config?.numberFormat || 'number'}
                    onChange={(e) => {
                      const fmt = e.target.value;
                      const defaultMax = fmt === 'percent' ? 1 : 100;
                      updateProperty(blockId, property.id, {
                        config: { 
                          ...property.config, 
                          numberFormat: fmt,
                          maxValue: property.config?.maxValue !== undefined ? property.config.maxValue : defaultMax
                        }
                      });
                    }}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      padding: '2px 4px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="number">Number</option>
                    <option value="percent">Percent</option>
                    <option value="usd">US Dollar ($)</option>
                    <option value="eur">Euro (€)</option>
                    <option value="gbp">Pound (£)</option>
                  </select>
                </div>

                {/* Decimal Places */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Decimal places</span>
                  <select
                    className="db-menu-select"
                    value={property.config?.decimalPlaces !== undefined ? property.config.decimalPlaces : 0}
                    onChange={(e) => {
                      updateProperty(blockId, property.id, {
                        config: { ...property.config, decimalPlaces: Number(e.target.value) }
                      });
                    }}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      padding: '2px 4px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {[0, 1, 2, 3, 4].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Show as Toggle */}
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Show as</div>
                  <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-subtle)', padding: '2px', gap: '2px' }}>
                    {[
                      { value: 'number', label: 'Number' },
                      { value: 'bar', label: 'Bar' },
                      { value: 'ring', label: 'Ring' }
                    ].map(opt => {
                      const active = (property.config?.showAs || 'number') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            updateProperty(blockId, property.id, {
                              config: { ...property.config, showAs: opt.value }
                            });
                          }}
                          style={{
                            flex: 1,
                            background: active ? 'var(--bg-hover)' : 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                            fontSize: '11px',
                            fontWeight: active ? 'bold' : 'normal',
                            padding: '4px 0',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Visual Settings (if Bar or Ring) */}
                {((property.config?.showAs || 'number') !== 'number') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    {/* Color */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Color</span>
                      <select
                        value={property.config?.progressColor || 'blue'}
                        onChange={(e) => {
                          updateProperty(blockId, property.id, {
                            config: { ...property.config, progressColor: e.target.value }
                          });
                        }}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '2px 4px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="purple">Purple</option>
                        <option value="orange">Orange</option>
                        <option value="red">Red</option>
                      </select>
                    </div>

                    {/* Show Number Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Show number</span>
                      <button
                        type="button"
                        className={`setting-toggle ${(property.config?.showNumber !== false) ? 'on' : ''}`}
                        onClick={() => {
                          const val = property.config?.showNumber !== false;
                          updateProperty(blockId, property.id, {
                            config: { ...property.config, showNumber: !val }
                          });
                        }}
                        style={{
                          width: '32px',
                          height: '16px',
                          borderRadius: '8px',
                          background: (property.config?.showNumber !== false) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                          border: 'none',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                      >
                        <div 
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: '3px',
                            left: (property.config?.showNumber !== false) ? '19px' : '3px',
                            transition: 'left 0.2s'
                          }}
                        />
                      </button>
                    </div>

                    {/* Max Value */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Max value</span>
                      <input
                        type="number"
                        className="db-menu-input"
                        value={property.config?.maxValue !== undefined ? property.config.maxValue : (property.config?.numberFormat === 'percent' ? 1 : 100)}
                        onChange={(e) => {
                          updateProperty(blockId, property.id, {
                            config: { ...property.config, maxValue: parseFloat(e.target.value) || 100 }
                          });
                        }}
                        style={{
                          width: '60px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '2px 4px',
                          textAlign: 'right'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {(property.type === PROPERTY_TYPES.RELATION || property.type === PROPERTY_TYPES.ROLLUP || property.type === PROPERTY_TYPES.FORMULA) && (
            <div className="db-menu-divider" />
          )}

          {property.type === PROPERTY_TYPES.RELATION && (
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
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

              {property.config?.relatedDatabaseId && (
                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
                  {property.config?.reciprocalPropertyId ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>Linked with reciprocal column in target database.</span>
                      <button 
                        className="db-add-row-btn" 
                        onClick={() => {
                          updateProperty(blockId, property.id, {
                            config: { ...property.config, reciprocalPropertyId: undefined }
                          });
                        }}
                        style={{ marginTop: '4px', width: '100%', justifyContent: 'center' }}
                      >
                        Remove Reciprocal Link
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="db-field-label" style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Reciprocal Column Name
                      </label>
                      <input 
                        className="db-menu-input"
                        placeholder="e.g. Related to..."
                        id="recip-name-input"
                        style={{ marginBottom: '6px' }}
                      />
                      <button 
                        className="db-add-row-btn" 
                        onClick={async () => {
                          const recipName = document.getElementById('recip-name-input')?.value?.trim();
                          const targetDbId = property.config.relatedDatabaseId;
                          const currentBlock = useBlockStore.getState().getBlock(blockId);
                          const currentDbName = currentBlock?.properties?.name || 'original database';
                          
                          const recipId = `prop_rel_${createId()}`;
                          const reciprocalProperty = {
                            id: recipId,
                            name: recipName || `Related to ${currentDbName}`,
                            type: PROPERTY_TYPES.RELATION,
                            width: 200,
                            config: {
                              relatedDatabaseId: blockId,
                              reciprocalPropertyId: property.id
                            }
                          };

                          await useDatabaseStore.getState().addPropertyToSchema(targetDbId, reciprocalProperty);
                          await updateProperty(blockId, property.id, {
                            config: {
                              ...property.config,
                              reciprocalPropertyId: recipId
                            }
                          });
                        }}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        Create Reciprocal Column
                      </button>
                    </div>
                  )}
                </div>
              )}
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

          {property.type === PROPERTY_TYPES.FORMULA && (
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="db-field-label" style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Formula Expression
              </label>
              <textarea
                className="db-menu-textarea"
                placeholder="e.g. prop('Price') * prop('Quantity')"
                value={property.config?.formula || ''}
                onChange={(e) => {
                  updateProperty(blockId, property.id, {
                    config: { ...property.config, formula: e.target.value }
                  });
                }}
                id="formula-textarea"
                style={{
                  width: '100%',
                  minHeight: '60px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  padding: '4px 6px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
              <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Click to insert:</span>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '80px', overflowY: 'auto', marginBottom: '6px' }}>
                  {currentSchema.filter(p => p.id !== property.id).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const txtArea = document.getElementById('formula-textarea');
                        if (txtArea) {
                          const val = property.config?.formula || '';
                          const start = txtArea.selectionStart;
                          const end = txtArea.selectionEnd;
                          const insertStr = `prop("${p.name}")`;
                          const next = val.substring(0, start) + insertStr + val.substring(end);
                          updateProperty(blockId, property.id, {
                            config: { ...property.config, formula: next }
                          });
                          setTimeout(() => {
                            txtArea.focus();
                            txtArea.selectionStart = txtArea.selectionEnd = start + insertStr.length;
                          }, 50);
                        }
                      }}
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1px 6px',
                        fontSize: '10px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {p.name || 'Untitled'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                  {[
                    { label: 'concat()', code: 'concat(a, b)' },
                    { label: 'if()', code: 'if(cond, t, f)' },
                    { label: 'lower()', code: 'lower(text)' },
                    { label: 'upper()', code: 'upper(text)' },
                    { label: 'contains()', code: 'contains(text, word)' },
                    { label: 'dateAdd()', code: 'dateAdd(date, 5, "days")' },
                    { label: 'length()', code: 'length(text)' },
                    { label: 'add()', code: 'add(a, b)' },
                    { label: 'subtract()', code: 'subtract(a, b)' }
                  ].map(fn => (
                    <button
                      key={fn.label}
                      onClick={() => {
                        const txtArea = document.getElementById('formula-textarea');
                        if (txtArea) {
                          const val = property.config?.formula || '';
                          const start = txtArea.selectionStart;
                          const end = txtArea.selectionEnd;
                          const insertStr = fn.code;
                          const next = val.substring(0, start) + insertStr + val.substring(end);
                          updateProperty(blockId, property.id, {
                            config: { ...property.config, formula: next }
                          });
                          setTimeout(() => {
                            txtArea.focus();
                            txtArea.selectionStart = txtArea.selectionEnd = start + insertStr.length;
                          }, 50);
                        }
                      }}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1px 5px',
                        fontSize: '10px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      {fn.label}
                    </button>
                  ))}
                </div>
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
