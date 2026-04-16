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
        <div className="p-2 flex flex-col gap-1">
          <div className="px-2 py-1">
            <input 
              autoFocus
              className="db-menu-input"
              value={property.name}
              onChange={handleRename}
              placeholder="Property name"
            />
          </div>

          <div className="db-menu-divider" />

          <button className="db-menu-item flex items-center justify-between" onClick={() => setIsChangingType(true)}>
            <div className="flex items-center gap-2">
              <Type size={14} />
              <span>Type</span>
            </div>
            <div className="flex items-center gap-1 text-tertiary">
              <span className="text-xs">{PROPERTY_TYPE_META[property.type].label}</span>
              <ChevronRight size={14} />
            </div>
          </button>

          <div className="db-menu-divider" />

          <button className="db-menu-item text-error flex items-center gap-2" onClick={handleDelete}>
            <Trash2 size={14} />
            <span>Delete Property</span>
          </button>
        </div>
      ) : (
        <div className="p-1 flex flex-col">
          <button className="db-menu-item-back flex items-center gap-2 px-2 py-2 hover:bg-hover rounded-md" onClick={() => setIsChangingType(false)}>
            <Icons.ChevronLeft size={14} />
            <span className="text-xs font-semibold uppercase text-tertiary">Select Type</span>
          </button>
          <div className="db-type-grid grid grid-cols-1 max-h-80 overflow-y-auto">
            {Object.entries(PROPERTY_TYPES).map(([key, type]) => {
              const meta = PROPERTY_TYPE_META[type];
              const Icon = Icons[meta.icon] || Type;
              return (
                <button 
                  key={type}
                  className={`db-type-item flex items-center gap-3 px-3 py-2 hover:bg-hover transition-colors rounded-md ${property.type === type ? 'bg-active' : ''}`}
                  onClick={() => handleChangeType(type)}
                >
                  <Icon size={14} className="text-tertiary" />
                  <div className="flex flex-col items-start translate-y-[1px]">
                    <span className="text-sm">{meta.label}</span>
                    <span className="text-[10px] text-tertiary leading-none">{meta.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
