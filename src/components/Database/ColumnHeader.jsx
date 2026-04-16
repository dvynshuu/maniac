import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PROPERTY_TYPE_META } from '../../utils/constants';
import * as Icons from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import ColumnMenu from './ColumnMenu';

export default function ColumnHeader({ 
  property, 
  blockId,
  isLast,
  className,
  onResizeStart 
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const meta = PROPERTY_TYPE_META[property.type];
  const Icon = Icons[meta.icon] || Icons.Type;

  const handleOpenMenu = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left
    });
    setMenuOpen(true);
  };

  return (
    <th 
      className={`db-th ${className || ''}`} 
      style={{ width: property.width || 200 }}
    >
      <div className="db-th-content flex items-center justify-between group">
        <div className="flex items-center gap-2 truncate pr-6" onClick={handleOpenMenu}>
          <Icon size={14} className="text-tertiary flex-shrink-0" />
          <span className="db-th-name truncate font-medium">{property.name}</span>
          <ChevronDown size={12} className="text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Resize Handle */}
        <div 
          className="db-col-resizer" 
          onMouseDown={(e) => onResizeStart(e, property.id)}
        />
      </div>

      {menuOpen && createPortal(
        <ColumnMenu
          property={property}
          blockId={blockId}
          position={menuPos}
          onClose={() => setMenuOpen(false)}
        />,
        document.body
      )}
    </th>
  );
}
