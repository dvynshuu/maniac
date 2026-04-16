import React, { useRef, useEffect } from 'react';
import { formatDate } from '../../utils/helpers';
import { Calendar } from 'lucide-react';

export default function DatePicker({ value, onChange, isEditing, stopEditing }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // On some browsers, we might want to trigger the picker immediately
      // inputRef.current.showPicker?.();
    }
  }, [isEditing]);

  if (!isEditing) {
    return (
      <div className="db-cell-date flex items-center gap-2">
        <Calendar size={12} className="text-tertiary" />
        <span>{value ? formatDate(value) : ''}</span>
      </div>
    );
  }

  return (
    <div className="db-date-picker-container">
      <input
        ref={inputRef}
        type="date"
        className="db-cell-input db-date-input"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={stopEditing}
        onKeyDown={(e) => e.key === 'Enter' && stopEditing()}
      />
    </div>
  );
}
