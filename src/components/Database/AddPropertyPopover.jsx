import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { PROPERTY_TYPES, PROPERTY_TYPE_META } from '../../utils/constants';
import { useDatabaseStore } from '../../stores/databaseStore';
import * as Icons from 'lucide-react';
import { Type, Plus, X } from 'lucide-react';

export default function AddPropertyPopover({ blockId, position, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState(PROPERTY_TYPES.TEXT);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: position.top, left: position.left });
  const addProperty = useDatabaseStore(s => s.addProperty);

  useLayoutEffect(() => {
    if (popoverRef.current) {
      const rect = popoverRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newLeft = position.left;
      let newTop = position.top;

      // Keep within horizontal bounds
      if (newLeft + rect.width > viewportWidth - 20) {
        newLeft = viewportWidth - rect.width - 20;
      }
      if (newLeft < 20) {
        newLeft = 20;
      }

      // Keep within vertical bounds
      if (newTop + rect.height > viewportHeight - 20) {
        newTop = viewportHeight - rect.height - 20;
      }
      if (newTop < 20) {
        newTop = 20;
      }

      setCoords({ top: newTop, left: newLeft });
    }
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await addProperty(blockId, { name: name.trim(), type });
    onClose();
  };

  return (
    <div 
      className="db-add-prop-popover" 
      ref={popoverRef}
      style={{ 
        top: coords.top, 
        left: coords.left,
        visibility: coords.top === position.top && coords.left === position.left ? 'hidden' : 'visible' 
      }}
    >
      <div className="db-popover-header">
        <span className="db-popover-title">Add Property</span>
        <button className="db-popover-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="db-popover-content">
        <div className="db-field-group">
          <label className="db-field-label">Name</label>
          <input 
            autoFocus
            className="db-popover-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Property name..."
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
        </div>

        <div className="db-field-group">
          <label className="db-field-label">Type</label>
          <div className="db-type-selector">
            {Object.entries(PROPERTY_TYPES).map(([key, t]) => {
              const meta = PROPERTY_TYPE_META[t];
              const Icon = Icons[meta.icon] || Type;
              const isSelected = type === t;
              return (
                <button 
                  key={t}
                  className={`db-type-option ${isSelected ? 'active' : ''}`}
                  onClick={() => setType(t)}
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
      </div>

      <div className="db-popover-footer">
        <button 
          className="db-popover-submit"
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          <Plus size={14} />
          <span>Create Property</span>
        </button>
      </div>
    </div>
  );
}
