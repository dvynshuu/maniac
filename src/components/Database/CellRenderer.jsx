import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PROPERTY_TYPES, PROPERTY_COLORS } from '../../utils/constants';
import { formatDate, formatDateTime, debounce } from '../../utils/helpers';
import { ExternalLink, Mail, Phone, Clock, Calendar, CheckSquare, Square, Type, Hash, Tag, Tags } from 'lucide-react';
import SelectDropdown from './SelectDropdown';
import DatePicker from './DatePicker';

export default function CellRenderer({ 
  property, 
  value, 
  onChange, 
  isActive, 
  isEditing, 
  startEditing, 
  stopEditing 
}) {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);

  // Sync with store when property/value changes outside (e.g. undo/redo)
  useEffect(() => {
    setLocalValue(value);
  }, [value, property.id]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Debounced save for semi-realtime updates without lag
  const debouncedOnChange = useCallback(
    debounce((nextVal) => {
      onChange(nextVal);
    }, 500),
    [onChange]
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    debouncedOnChange(val);
  };

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
    stopEditing();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (localValue !== value) onChange(localValue);
      stopEditing();
    } else if (e.key === 'Escape') {
      setLocalValue(value); // Revert
      stopEditing();
    }
  };

  const renderContent = () => {
    switch (property.type) {
      case PROPERTY_TYPES.TEXT:
        return isEditing ? (
          <input
            ref={inputRef}
            className="db-cell-input"
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="db-cell-text">{value || ''}</div>
        );

      case PROPERTY_TYPES.NUMBER:
        return isEditing ? (
          <input
            ref={inputRef}
            type="number"
            className="db-cell-input"
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="db-cell-number text-right">{value || ''}</div>
        );

      case PROPERTY_TYPES.CHECKBOX:
        return (
          <div className="db-cell-checkbox flex justify-center">
            <button 
              className={`db-checkbox ${value ? 'active' : ''}`}
              onClick={() => onChange(!value)}
            >
              {value ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
          </div>
        );

      case PROPERTY_TYPES.SELECT:
        return (
          <SelectDropdown
            property={property}
            value={value}
            onChange={onChange}
            isEditing={isEditing}
            stopEditing={stopEditing}
          />
        );

      case PROPERTY_TYPES.MULTI_SELECT:
        return (
          <SelectDropdown
            property={property}
            value={value}
            onChange={onChange}
            isEditing={isEditing}
            stopEditing={stopEditing}
            multi
          />
        );

      case PROPERTY_TYPES.DATE:
        return (
          <DatePicker
            value={value}
            onChange={onChange}
            isEditing={isEditing}
            stopEditing={stopEditing}
          />
        );

      case PROPERTY_TYPES.URL:
        return isEditing ? (
          <input
            ref={inputRef}
            className="db-cell-input"
            placeholder="https://..."
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="db-cell-url flex items-center gap-2">
            <span className="truncate">{value || ''}</span>
            {value && (
              <a href={value} target="_blank" rel="noopener noreferrer" className="db-cell-link-icon">
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        );

      case PROPERTY_TYPES.EMAIL:
        return isEditing ? (
          <input
            ref={inputRef}
            className="db-cell-input"
            placeholder="name@example.com"
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="db-cell-email flex items-center gap-2">
             <Mail size={12} className="text-tertiary" />
             <span>{value || ''}</span>
          </div>
        );

      case PROPERTY_TYPES.PHONE:
        return isEditing ? (
          <input
            ref={inputRef}
            className="db-cell-input"
            placeholder="+1..."
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="db-cell-phone flex items-center gap-2">
             <Phone size={12} className="text-tertiary" />
             <span>{value || ''}</span>
          </div>
        );

      case PROPERTY_TYPES.CREATED_AT:
        return (
          <div className="db-cell-timestamp text-xs text-tertiary">
            {formatDate(value)}
          </div>
        );

      default:
        return <div className="text-error">Error</div>;
    }
  };

  return (
    <div 
      className={`db-cell ${isActive ? 'is-active' : ''} ${isEditing ? 'is-editing' : ''}`}
      onDoubleClick={property.type !== PROPERTY_TYPES.CHECKBOX && property.type !== PROPERTY_TYPES.CREATED_AT ? startEditing : undefined}
    >
      {renderContent()}
    </div>
  );
}
