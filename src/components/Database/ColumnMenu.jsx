import React, { useState, useRef, useEffect } from 'react';
import { PROPERTY_TYPES, PROPERTY_TYPE_META } from '../../utils/constants';
import { useDatabaseStore } from '../../stores/databaseStore';
import * as Icons from 'lucide-react';
import { Trash2, Type, Hash, Tag, Tags, Calendar, CheckSquare, Link, Mail, Phone, Clock, ChevronRight } from 'lucide-react';

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

  const handleRename = (e) => {
    updateProperty(blockId, property.id, { name: e.target.value });
  };

  const handleChangeType = (newType) => {
    updateProperty(blockId, property.id, { type: newType });
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
