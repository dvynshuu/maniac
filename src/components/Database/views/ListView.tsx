import React, { useState } from 'react';
import { 
  FileText, Plus, ChevronRight, CheckSquare, Square, 
  ExternalLink, MoreHorizontal, Calendar, Tag, Trash2, Copy 
} from 'lucide-react';
import EmojiIcon from '../../Common/EmojiIcon';
import { PROPERTY_TYPES } from '../../../utils/constants';

interface ListViewProps {
  schema: any[];
  rows: any[];
  blockId: string;
  onUpdateCell: (blockId: string, rowId: string, propId: string, val: any) => void;
  onUpdateCellImmediate: (blockId: string, rowId: string, propId: string, val: any) => void;
  onAddRow: (overrides?: any) => Promise<any>;
  onOpenRow: (row: any) => void;
}

export default function ListView({
  schema,
  rows,
  blockId,
  onUpdateCell,
  onUpdateCellImmediate,
  onAddRow,
  onOpenRow
}: ListViewProps) {
  const [editingTitleRowId, setEditingTitleRowId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');

  const titleProp = schema[0] || { id: 'title', name: 'Name' };
  const checkboxProp = schema.find(p => p.type === PROPERTY_TYPES.CHECKBOX);
  const statusProp = schema.find(p => p.type === PROPERTY_TYPES.STATUS);
  const dateProp = schema.find(p => p.type === PROPERTY_TYPES.DATE);
  const selectProps = schema.filter(p => p.type === PROPERTY_TYPES.SELECT || p.type === PROPERTY_TYPES.MULTI_SELECT);

  const handleStartEditTitle = (e: React.MouseEvent, row: any) => {
    e.stopPropagation();
    setEditingTitleRowId(row.id);
    setTitleInput(row.values[titleProp.id] || '');
  };

  const handleSaveTitle = (rowId: string) => {
    if (titleInput !== undefined) {
      onUpdateCell(blockId, rowId, titleProp.id, titleInput);
    }
    setEditingTitleRowId(null);
  };

  return (
    <div className="db-list-view-container">
      <div className="db-list-rows-group">
        {rows.map((row) => {
          const title = row.values[titleProp.id] || 'Untitled';
          const isDone = checkboxProp ? Boolean(row.values[checkboxProp.id]) : false;
          const statusVal = statusProp ? row.values[statusProp.id] : null;
          const dateVal = dateProp ? row.values[dateProp.id] : null;

          return (
            <div
              key={row.id}
              className={`db-list-row group ${isDone ? 'is-completed' : ''}`}
              onClick={() => onOpenRow(row)}
            >
              {/* Left: Checkbox & Title */}
              <div className="db-list-row-left">
                {checkboxProp && (
                  <button
                    type="button"
                    className="db-list-checkbox-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateCellImmediate(blockId, row.id, checkboxProp.id, !isDone);
                    }}
                    title={isDone ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isDone ? (
                      <CheckSquare size={16} className="text-accent" />
                    ) : (
                      <Square size={16} className="text-tertiary" />
                    )}
                  </button>
                )}

                <span className="db-list-row-icon">
                  <EmojiIcon emoji={row.icon || '📄'} size="15px" />
                </span>

                {editingTitleRowId === row.id ? (
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={() => handleSaveTitle(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle(row.id);
                      if (e.key === 'Escape') setEditingTitleRowId(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="db-list-title-input"
                  />
                ) : (
                  <span
                    className={`db-list-title ${isDone ? 'line-through opacity-60' : ''}`}
                    onDoubleClick={(e) => handleStartEditTitle(e, row)}
                  >
                    {title}
                  </span>
                )}
              </div>

              {/* Right: Property Badges & Actions */}
              <div className="db-list-row-right">
                {/* Status Badge */}
                {statusVal && (
                  <span className="db-list-status-pill">
                    <span className="status-dot" />
                    <span className="status-text">{String(statusVal)}</span>
                  </span>
                )}

                {/* Tags / Select badges */}
                {selectProps.map(sp => {
                  const val = row.values[sp.id];
                  if (!val) return null;
                  const tags = Array.isArray(val) ? val : [val];
                  return tags.map((t, i) => (
                    <span key={i} className="db-list-tag-pill">
                      {String(t)}
                    </span>
                  ));
                })}

                {/* Date Badge */}
                {dateVal && (
                  <span className="db-list-date-pill">
                    <Calendar size={11} />
                    <span>{String(dateVal)}</span>
                  </span>
                )}

                {/* Open Button on Hover */}
                <button
                  type="button"
                  className="db-list-open-btn opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRow(row);
                  }}
                  title="Open row as page"
                >
                  <span>Open</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Row Button */}
      <div className="db-list-footer">
        <button
          type="button"
          className="db-list-add-row-btn"
          onClick={() => onAddRow()}
        >
          <Plus size={14} />
          <span>New</span>
        </button>
      </div>
    </div>
  );
}
