import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PROPERTY_COLORS } from '../../utils/constants';
import { useDatabaseStore } from '../../stores/databaseStore';
import { X, Check, Search, Plus } from 'lucide-react';

export default function SelectDropdown({ 
  property, 
  value, 
  onChange, 
  isEditing, 
  stopEditing, 
  multi = false 
}) {
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const updateProperty = useDatabaseStore(s => s.updateProperty);

  const selectedValues = useMemo(() => {
    if (!value) return [];
    return multi ? (Array.isArray(value) ? value : [value]) : [value];
  }, [value, multi]);

  const options = property.config.options || [];

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const selectedOptions = useMemo(() => {
    return options.filter(opt => selectedValues.includes(opt.id));
  }, [options, selectedValues]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        stopEditing();
      }
    };
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, stopEditing]);

  const handleToggleOption = (optionId) => {
    if (multi) {
      const newValue = selectedValues.includes(optionId)
        ? selectedValues.filter(id => id !== optionId)
        : [...selectedValues, optionId];
      onChange(newValue);
    } else {
      onChange(optionId);
      stopEditing();
    }
  };

  const handleCreateOption = async () => {
    if (!search.trim()) return;
    
    const newOption = {
      id: `opt_${Date.now()}`,
      label: search.trim(),
      color: PROPERTY_COLORS[Math.floor(Math.random() * PROPERTY_COLORS.length)].name
    };

    const newOptions = [...options, newOption];
    await updateProperty(property.blockId, property.id, {
      config: { ...property.config, options: newOptions }
    });

    handleToggleOption(newOption.id);
    setSearch('');
  };

  const removeSelected = (e, optionId) => {
    e.stopPropagation();
    onChange(selectedValues.filter(id => id !== optionId));
  };

  if (!isEditing) {
    return (
      <div className="db-cell-tags flex flex-wrap gap-1">
        {selectedOptions.length > 0 ? (
          selectedOptions.map(opt => (
            <span 
              key={opt.id} 
              className={`db-tag db-tag-${opt.color || 'default'}`}
            >
              {opt.label}
            </span>
          ))
        ) : (
          <span className="text-tertiary">Select...</span>
        )}
      </div>
    );
  }

  return (
    <div className="db-select-dropdown" ref={dropdownRef}>
      <div className="db-select-search flex items-center gap-2 p-2 border-bottom">
        <Search size={14} className="text-tertiary" />
        <input 
          autoFocus
          className="db-select-input"
          placeholder="Search or create..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && search && filteredOptions.length === 0) {
              handleCreateOption();
            }
          }}
        />
      </div>

      <div className="db-select-options max-h-60 overflow-y-auto p-1">
        {filteredOptions.length > 0 ? (
          filteredOptions.map(opt => (
            <button
              key={opt.id}
              className={`db-select-option flex items-center justify-between w-full h-8 px-2 rounded-md transition-colors ${selectedValues.includes(opt.id) ? 'is-selected' : ''}`}
              onClick={() => handleToggleOption(opt.id)}
            >
              <span className={`db-tag db-tag-${opt.color || 'default'}`}>{opt.label}</span>
              {selectedValues.includes(opt.id) && <Check size={14} className="text-accent-primary" />}
            </button>
          ))
        ) : (
          search ? (
            <button 
              className="db-select-create flex items-center gap-2 w-full h-8 px-2 rounded-md hover:bg-hover transition-colors"
              onClick={handleCreateOption}
            >
              <Plus size={14} />
              <span className="text-xs">Create "{search}"</span>
            </button>
          ) : (
            <div className="p-3 text-center text-xs text-tertiary">No options</div>
          )
        )}
      </div>
    </div>
  );
}
