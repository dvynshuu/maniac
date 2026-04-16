import React, { useState, useRef, useEffect } from 'react';
import { PROPERTY_TYPES, PROPERTY_TYPE_META } from '../../utils/constants';
import { useDatabaseStore } from '../../stores/databaseStore';
import * as Icons from 'lucide-react';
import { Type, Plus } from 'lucide-react';

export default function AddPropertyPopover({ blockId, position, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState(PROPERTY_TYPES.TEXT);
  const popoverRef = useRef(null);
  const addProperty = useDatabaseStore(s => s.addProperty);

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
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-tertiary">Property Name</label>
          <input 
            autoFocus
            className="db-menu-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Property name..."
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-tertiary">Type</label>
          <div className="db-type-grid grid grid-cols-1 max-h-60 overflow-y-auto border rounded-lg bg-tertiary">
            {Object.entries(PROPERTY_TYPES).map(([key, t]) => {
              const meta = PROPERTY_TYPE_META[t];
              const Icon = Icons[meta.icon] || Type;
              return (
                <button 
                  key={t}
                  className={`db-type-item flex items-center gap-3 px-3 py-2 hover:bg-hover transition-colors ${type === t ? 'bg-active' : ''}`}
                  onClick={() => setType(t)}
                >
                  <Icon size={14} className="text-tertiary" />
                  <span className="text-sm">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button 
          className="btn btn-primary w-full shadow-md"
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
