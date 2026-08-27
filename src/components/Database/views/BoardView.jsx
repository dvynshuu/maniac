import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  CheckSquare, 
  Tag, 
  Hash, 
  FileText, 
  ChevronRight, 
  Image as ImageIcon,
  Check, 
  RotateCcw, 
  Sparkles, 
  LayoutGrid, 
  Columns, 
  X, 
  Layers,
  Flame,
  Zap,
  Sliders,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../../utils/constants';
import { useDatabaseStore } from '../../../stores/databaseStore';

// Inline Editable Card Title Component
function EditableCardTitle({ value, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value || '');

  React.useEffect(() => {
    setText(value || '');
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== value) {
      onSave(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      if (text !== value) {
        onSave(text);
      }
    }
    if (e.key === 'Escape') {
      setText(value || '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="habit-card-title-input"
        placeholder="Day name (e.g. Monday)..."
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className="habit-card-title editable"
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Click to edit name"
    >
      {value ? value : <span className="habit-card-title-placeholder">Untitled</span>}
    </span>
  );
}

// Preset cover images (Anime, Focus, Aesthetics)
export const COVER_PRESETS = [
  {
    name: 'Goku (Dragon Ball)',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    category: 'Anime',
    emoji: '🥋'
  },
  {
    name: 'Solo Leveling (Jin-Woo)',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    category: 'Anime',
    emoji: '⚔️'
  },
  {
    name: 'Deku (My Hero)',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80',
    category: 'Anime',
    emoji: '⚡'
  },
  {
    name: 'Demon Slayer Flame',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    category: 'Anime',
    emoji: '🔥'
  },
  {
    name: 'Mob Psycho 100',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
    category: 'Anime',
    emoji: '🧠'
  },
  {
    name: 'Gojo Satoru (JJK)',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    category: 'Anime',
    emoji: '👁️'
  },
  {
    name: 'Berserk Guts',
    url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80',
    category: 'Anime',
    emoji: '🗡️'
  },
  {
    name: 'Neon Cyberpunk',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80',
    category: 'Aesthetic',
    emoji: '🌆'
  },
  {
    name: 'Deep Nebula',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    category: 'Aesthetic',
    emoji: '🌌'
  },
  {
    name: 'Aesthetic Mountains',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    category: 'Aesthetic',
    emoji: '🏔️'
  }
];

// Cover Image Popover Component
function CoverImageModal({ isOpen, onClose, currentUrl, onSelectCover }) {
  const [customUrl, setCustomUrl] = useState(currentUrl || '');
  const [selectedCategory, setSelectedCategory] = useState('All');

  if (!isOpen) return null;

  const categories = ['All', 'Anime', 'Aesthetic'];
  const filteredPresets = selectedCategory === 'All' 
    ? COVER_PRESETS 
    : COVER_PRESETS.filter(p => p.category === selectedCategory);

  return createPortal(
    <div className="habit-modal-backdrop" onClick={onClose}>
      <div className="habit-cover-modal" onClick={e => e.stopPropagation()}>
        <div className="habit-cover-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={16} className="text-accent" />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Choose Card Cover</span>
          </div>
          <button className="habit-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Custom URL Input */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 600 }}>
            IMAGE URL (GIF OR PICTURE)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="habit-url-input"
              placeholder="Paste any image or GIF URL..."
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && customUrl.trim()) {
                  onSelectCover(customUrl.trim());
                  onClose();
                }
              }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (customUrl.trim()) {
                  onSelectCover(customUrl.trim());
                  onClose();
                }
              }}
            >
              Set Cover
            </button>
          </div>
        </div>

        {/* Preset Categories */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: '6px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`habit-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
          {currentUrl && (
            <button
              onClick={() => {
                onSelectCover('');
                onClose();
              }}
              style={{
                marginLeft: 'auto',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Remove Cover
            </button>
          )}
        </div>

        {/* Presets Grid */}
        <div className="habit-presets-grid">
          {filteredPresets.map((preset, idx) => (
            <div
              key={idx}
              className="habit-preset-card"
              onClick={() => {
                onSelectCover(preset.url);
                onClose();
              }}
            >
              <div 
                className="habit-preset-thumb" 
                style={{ backgroundImage: `url(${preset.url})` }}
              />
              <div className="habit-preset-info">
                <span>{preset.emoji} {preset.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function BoardView({ 
  schema, 
  rows, 
  blockId, 
  onUpdateCell, 
  onUpdateCellImmediate, 
  onAddRow, 
  onOpenRow, 
  groupPropertyId: propGroupPropertyId 
}) {
  // Find group-by property (prefer select, multi_select, or status, else first property)
  const groupableProperties = useMemo(() => {
    return schema.filter(p => [
      PROPERTY_TYPES.SELECT, 
      PROPERTY_TYPES.MULTI_SELECT, 
      PROPERTY_TYPES.CHECKBOX,
      PROPERTY_TYPES.TEXT
    ].includes(p.type));
  }, [schema]);

  const [selectedGroupPropId, setSelectedGroupPropId] = useState(
    propGroupPropertyId || 
    schema.find(p => p.type === PROPERTY_TYPES.SELECT || p.type === 'status')?.id || 
    groupableProperties[0]?.id || 
    schema[0]?.id
  );

  const groupProperty = useMemo(() => {
    return schema.find(p => p.id === selectedGroupPropId) || schema[0];
  }, [schema, selectedGroupPropId]);

  // Layout mode: 'grid' (aesthetic card grid) vs 'kanban' (columns)
  const [boardLayout, setBoardLayout] = useState('grid');
  const [showStatsSidebar, setShowStatsSidebar] = useState(true);
  const [coverModalRowId, setCoverModalRowId] = useState(null);
  const [statsCoverModal, setStatsCoverModal] = useState(false);
  const [statsCoverImage, setStatsCoverImage] = useState('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80');
  const [resetToast, setResetToast] = useState(false);
  const [addingTaskCardId, setAddingTaskCardId] = useState(null);
  const [cardTaskInput, setCardTaskInput] = useState('');

  // Checkbox properties for shared habits / checklists
  const checkboxProperties = useMemo(() => {
    return schema.filter(p => p.type === PROPERTY_TYPES.CHECKBOX);
  }, [schema]);

  const hasCheckboxGoals = useMemo(() => {
    if (checkboxProperties.length > 0) return true;
    return rows.some(r => Array.isArray(r.values?.cardTasks) && r.values.cardTasks.length > 0);
  }, [checkboxProperties, rows]);

  // Add task to a specific card only
  const handleAddCardSpecificTask = (rowId) => {
    if (!cardTaskInput.trim()) {
      setAddingTaskCardId(null);
      return;
    }
    const targetRow = rows.find(r => r.id === rowId);
    const existing = Array.isArray(targetRow?.values?.cardTasks) ? targetRow.values.cardTasks : [];
    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: cardTaskInput.trim(),
      checked: false
    };
    onUpdateCellImmediate(blockId, rowId, 'cardTasks', [...existing, newTask]);
    setCardTaskInput('');
    setAddingTaskCardId(null);
  };

  // Toggle task on a specific card only
  const handleToggleCardSpecificTask = (rowId, taskId) => {
    const targetRow = rows.find(r => r.id === rowId);
    const existing = Array.isArray(targetRow?.values?.cardTasks) ? targetRow.values.cardTasks : [];
    const updated = existing.map(t => t.id === taskId ? { ...t, checked: !t.checked } : t);
    onUpdateCellImmediate(blockId, rowId, 'cardTasks', updated);
  };

  // Delete task from a specific card only
  const handleDeleteCardSpecificTask = (rowId, taskId) => {
    const targetRow = rows.find(r => r.id === rowId);
    const existing = Array.isArray(targetRow?.values?.cardTasks) ? targetRow.values.cardTasks : [];
    const updated = existing.filter(t => t.id !== taskId);
    onUpdateCellImmediate(blockId, rowId, 'cardTasks', updated);
  };

  // Drag-and-drop state
  const [draggedRowId, setDraggedRowId] = useState(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState(null);

  // Group columns for Kanban mode
  const columns = useMemo(() => {
    if (!groupProperty) return [{ key: '__all', label: 'All Items', rows, color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.05)' }];

    const cols = [];
    const isSelect = groupProperty.type === PROPERTY_TYPES.SELECT || groupProperty.type === 'status';
    const isCheckbox = groupProperty.type === PROPERTY_TYPES.CHECKBOX;

    if (isSelect && groupProperty.config?.options && groupProperty.config.options.length > 0) {
      // Configured options
      groupProperty.config.options.forEach(opt => {
        const key = typeof opt === 'string' ? opt : opt.value || opt.name;
        const label = typeof opt === 'string' ? opt : opt.name || opt.value;
        const color = opt.color || 'var(--accent-primary)';
        const bg = opt.bg || 'rgba(99, 102, 241, 0.15)';
        cols.push({
          key,
          label,
          color,
          bg,
          rows: rows.filter(r => String(r.values[groupProperty.id] || '') === String(key))
        });
      });
      // "No Option" column for unassigned
      cols.unshift({
        key: '__empty',
        label: 'No ' + (groupProperty.name || 'Status'),
        color: 'var(--text-tertiary)',
        bg: 'rgba(255, 255, 255, 0.04)',
        rows: rows.filter(r => !r.values[groupProperty.id] || r.values[groupProperty.id] === '')
      });
    } else if (isCheckbox) {
      cols.push({
        key: 'false',
        label: 'To Do',
        color: 'var(--text-secondary)',
        bg: 'rgba(255, 255, 255, 0.05)',
        rows: rows.filter(r => !r.values[groupProperty.id])
      });
      cols.push({
        key: 'true',
        label: 'Completed',
        color: 'var(--success)',
        bg: 'rgba(16, 185, 129, 0.15)',
        rows: rows.filter(r => !!r.values[groupProperty.id])
      });
    } else {
      // Dynamic grouping by unique values
      const uniqueVals = new Set();
      rows.forEach(r => {
        const val = r.values[groupProperty.id];
        if (val !== undefined && val !== null && val !== '') {
          uniqueVals.add(String(val));
        }
      });
      cols.push({
        key: '__empty',
        label: 'No ' + (groupProperty.name || 'Value'),
        color: 'var(--text-tertiary)',
        bg: 'rgba(255, 255, 255, 0.04)',
        rows: rows.filter(r => !r.values[groupProperty.id] || r.values[groupProperty.id] === '')
      });
      uniqueVals.forEach(val => {
        cols.push({
          key: val,
          label: val,
          color: 'var(--accent-primary)',
          bg: 'rgba(99, 102, 241, 0.12)',
          rows: rows.filter(r => String(r.values[groupProperty.id]) === val)
        });
      });
    }

    return cols;
  }, [groupProperty, rows]);

  // Aggregate stats across all rows (shared properties + per-card tasks)
  const stats = useMemo(() => {
    let totalCompleted = 0;
    let totalGoals = 0;
    
    rows.forEach(r => {
      checkboxProperties.forEach(p => {
        totalGoals++;
        if (r.values[p.id]) totalCompleted++;
      });
      const cardTasks = Array.isArray(r.values?.cardTasks) ? r.values.cardTasks : [];
      cardTasks.forEach(t => {
        totalGoals++;
        if (t.checked) totalCompleted++;
      });
    });

    const progressPercentage = totalGoals > 0 ? Math.round((totalCompleted / totalGoals) * 100) : 0;

    return {
      totalCompleted,
      totalGoals,
      progressPercentage
    };
  }, [rows, checkboxProperties]);

  const handleDragStart = (e, rowId) => {
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedRowId(rowId);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnKey !== colKey) {
      setDragOverColumnKey(colKey);
    }
  };

  const handleDrop = (e, targetColKey) => {
    e.preventDefault();
    setDragOverColumnKey(null);
    const rowId = e.dataTransfer.getData('text/plain') || draggedRowId;
    setDraggedRowId(null);
    if (!rowId || !groupProperty) return;

    let targetValue = targetColKey === '__empty' ? '' : targetColKey;
    if (groupProperty.type === PROPERTY_TYPES.CHECKBOX) {
      targetValue = targetColKey === 'true';
    }

    onUpdateCellImmediate(blockId, rowId, groupProperty.id, targetValue);
  };

  const handleAddCardInColumn = (colKey) => {
    let initialVal = colKey === '__empty' ? '' : colKey;
    if (groupProperty && groupProperty.type === PROPERTY_TYPES.CHECKBOX) {
      initialVal = colKey === 'true';
    }
    const overrides = groupProperty ? { [groupProperty.id]: initialVal } : {};
    onAddRow(overrides);
  };

  // Weekly Reset: Unchecks all checkbox properties and card-specific tasks across all rows
  const handleWeeklyReset = () => {
    rows.forEach(r => {
      checkboxProperties.forEach(p => {
        if (r.values[p.id]) {
          onUpdateCellImmediate(blockId, r.id, p.id, false);
        }
      });
      const cardTasks = Array.isArray(r.values?.cardTasks) ? r.values.cardTasks : [];
      if (cardTasks.some(t => t.checked)) {
        const resetTasks = cardTasks.map(t => ({ ...t, checked: false }));
        onUpdateCellImmediate(blockId, r.id, 'cardTasks', resetTasks);
      }
    });
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2500);
  };

  // Quick Preset: Sets up 7 Days with anime covers without hardcoding any tasks
  const handleSetupWeeklyHabitPreset = async () => {
    const store = useDatabaseStore.getState();

    // Preset days with covers
    const defaultDays = [
      { title: '💪 Monday', cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80' },
      { title: '⚔️ Tuesday', cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80' },
      { title: '⚡ Wednesday', cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80' },
      { title: '👊 Thursday', cover: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80' },
      { title: '📜 Friday', cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80' },
      { title: '💥 Saturday', cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80' },
      { title: '🌟 Sunday', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80' }
    ];

    // Clean up empty untitled placeholder rows if they exist
    const currentData = store.getDatabaseData(blockId);
    const currentRows = currentData?.rows || [];
    for (const r of currentRows) {
      const tVal = r.values[titleProp.id] || '';
      if (!tVal || tVal.trim() === '' || tVal === 'Untitled') {
        await store.deleteRow(blockId, r.id);
      }
    }

    for (const day of defaultDays) {
      await store.addRow(blockId, {
        [titleProp.id]: day.title,
        coverImage: day.cover
      });
    }
  };

  const titleProp = schema[0] || { id: 'title', name: 'Name' };
  const otherPreviewProps = schema.filter(p => 
    p.id !== titleProp.id && 
    p.id !== groupProperty?.id && 
    p.type !== PROPERTY_TYPES.CHECKBOX
  ).slice(0, 2);

  // Render a Single Habit Card
  const renderCard = (row) => {
    const title = row.values[titleProp.id] || 'Untitled';
    const coverImage = row.values.coverImage || null;
    const isDragging = draggedRowId === row.id;

    // Calculate completed goals for this specific card
    const cardTasks = Array.isArray(row.values?.cardTasks) ? row.values.cardTasks : [];
    const sharedDone = checkboxProperties.filter(p => !!row.values[p.id]).length;
    const cardDone = cardTasks.filter(t => !!t.checked).length;
    const doneGoals = sharedDone + cardDone;
    const totalGoals = checkboxProperties.length + cardTasks.length;

    return (
      <div
        key={row.id}
        draggable
        onDragStart={(e) => handleDragStart(e, row.id)}
        className={`habit-board-card ${isDragging ? 'dragging' : ''}`}
      >
        {/* Card Cover Image Header */}
        <div
          className="habit-card-cover"
          style={{
            backgroundImage: coverImage ? `url(${coverImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!coverImage && (
            <div className="habit-card-cover-empty">
              <ImageIcon size={18} opacity={0.35} />
            </div>
          )}

          {/* Hover Controls for Cover */}
          <div className="habit-card-cover-overlay">
            <button
              className="habit-cover-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setCoverModalRowId(row.id);
              }}
              title="Change cover"
            >
              <ImageIcon size={12} />
              <span>{coverImage ? 'Reposition / Edit' : '+ Add Cover'}</span>
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="habit-card-body">
          {/* Card Title */}
          <div className="habit-card-title-row">
            <EditableCardTitle
              value={row.values[titleProp.id] || ''}
              onSave={(newTitle) => onUpdateCellImmediate(blockId, row.id, titleProp.id, newTitle)}
            />
            <button
              className="habit-card-open-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRow(row);
              }}
              title="Open as full page"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Interactive Checkbox Goals List */}
          <div className="habit-card-checklist">
            {/* Shared Schema Checkbox Properties (if any) */}
            {checkboxProperties.map(prop => {
              const isChecked = !!row.values[prop.id];
              return (
                <div key={prop.id} className="habit-checklist-row">
                  <label
                    className={`habit-checklist-item ${isChecked ? 'checked' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateCellImmediate(blockId, row.id, prop.id, e.target.checked);
                      }}
                      className="habit-native-checkbox"
                    />
                    <span className="habit-custom-box">
                      {isChecked && <Check size={11} strokeWidth={3.5} />}
                    </span>
                    <span className="habit-checklist-label">{prop.name}</span>
                  </label>
                  <button
                    className="habit-goal-delete-btn"
                    title={`Delete shared habit "${prop.name}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      useDatabaseStore.getState().deleteProperty(blockId, prop.id);
                    }}
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}

            {/* Card-Specific Tasks (Specific to this day only) */}
            {cardTasks.map(task => (
              <div key={task.id} className="habit-checklist-row">
                <label
                  className={`habit-checklist-item ${task.checked ? 'checked' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={!!task.checked}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleCardSpecificTask(row.id, task.id);
                    }}
                    className="habit-native-checkbox"
                  />
                  <span className="habit-custom-box">
                    {task.checked && <Check size={11} strokeWidth={3.5} />}
                  </span>
                  <span className="habit-checklist-label">{task.name}</span>
                </label>
                <button
                  className="habit-goal-delete-btn"
                  title={`Delete task "${task.name}"`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCardSpecificTask(row.id, task.id);
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* Inline Add Task for THIS card only */}
            {addingTaskCardId === row.id ? (
              <div className="habit-add-goal-inline" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Task for this day..."
                  value={cardTaskInput}
                  onChange={e => setCardTaskInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCardSpecificTask(row.id);
                    if (e.key === 'Escape') setAddingTaskCardId(null);
                  }}
                  className="habit-add-goal-input"
                />
                <button className="habit-add-goal-submit" onClick={() => handleAddCardSpecificTask(row.id)}>
                  <Check size={12} />
                </button>
                <button className="habit-add-goal-cancel" onClick={() => setAddingTaskCardId(null)}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                className="habit-add-goal-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setCardTaskInput('');
                  setAddingTaskCardId(row.id);
                }}
              >
                <Plus size={12} />
                <span>Add task</span>
              </button>
            )}
          </div>

          {/* Non-checkbox Extra Properties Badges */}
          {otherPreviewProps.length > 0 && (
            <div className="habit-card-extra-props">
              {otherPreviewProps.map(p => {
                const val = row.values[p.id];
                if (val === undefined || val === null || val === '') return null;
                return (
                  <div key={p.id} className="habit-prop-chip">
                    <span className="habit-prop-chip-name">{p.name}:</span>
                    <span>{String(val)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Progress Counter Footer */}
          {checkboxProperties.length > 0 && (
            <div className="habit-card-progress-footer">
              <span className="habit-progress-text">
                Done: <strong>{doneGoals}/{totalGoals}</strong> goals
              </span>
              {doneGoals === totalGoals && totalGoals > 0 ? (
                <span className="habit-progress-status success">🎉 all done!</span>
              ) : doneGoals > 0 ? (
                <span className="habit-progress-status active">✅ keep going!</span>
              ) : (
                <span className="habit-progress-status idle">⏳ start today</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="board-view-wrapper">
      {/* Board Controls Bar */}
      <div className="board-subtoolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Layout Mode Toggle: Grid vs Kanban */}
          <div className="board-layout-toggle">
            <button
              className={`board-layout-btn ${boardLayout === 'grid' ? 'active' : ''}`}
              onClick={() => setBoardLayout('grid')}
              title="Card Grid View"
            >
              <LayoutGrid size={13} />
              <span>Grid</span>
            </button>
            <button
              className={`board-layout-btn ${boardLayout === 'kanban' ? 'active' : ''}`}
              onClick={() => setBoardLayout('kanban')}
              title="Kanban Columns View"
            >
              <Columns size={13} />
              <span>Columns</span>
            </button>
          </div>

          {boardLayout === 'kanban' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Group by:</span>
              <select
                value={selectedGroupPropId}
                onChange={(e) => setSelectedGroupPropId(e.target.value)}
                className="board-group-select"
              >
                {groupableProperties.map(p => (
                  <option key={p.id} value={p.id}>{p.name || 'Untitled'}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Preset Generator Button */}
          {rows.length <= 3 && (
            <button
              className="habit-preset-btn"
              onClick={handleSetupWeeklyHabitPreset}
              title="Auto-fill 7 Days with anime covers and habit tracker checkboxes"
            >
              <Sparkles size={13} />
              <span>⚡ Load Habit Preset</span>
            </button>
          )}

          {/* Toggle Stats Sidebar */}
          {hasCheckboxGoals && (
            <button
              className={`board-stats-toggle-btn ${showStatsSidebar ? 'active' : ''}`}
              onClick={() => setShowStatsSidebar(!showStatsSidebar)}
              title="Toggle Weekly Stats Sidebar"
            >
              <Flame size={13} />
              <span>Weekly Stats</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Board Container */}
      <div className="board-main-layout">
        {/* Left / Center: Cards Area */}
        <div className="board-content-area">
          {boardLayout === 'grid' ? (
            /* Responsive Cards Grid Layout */
            <div className="habit-cards-grid">
              {rows.map(row => renderCard(row))}

              {/* Add Card Quick Box */}
              <div 
                className="habit-add-card-placeholder"
                onClick={() => onAddRow()}
              >
                <Plus size={18} />
                <span>+ New Day / Card</span>
              </div>
            </div>
          ) : (
            /* Kanban Columns Layout */
            <div className="kanban-columns-container">
              {columns.map(col => {
                const isOver = dragOverColumnKey === col.key;
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDragLeave={() => setDragOverColumnKey(null)}
                    onDrop={(e) => handleDrop(e, col.key)}
                    className={`kanban-column ${isOver ? 'drag-over' : ''}`}
                  >
                    {/* Column Header */}
                    <div className="kanban-column-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          className="kanban-column-badge"
                          style={{ color: col.color, background: col.bg }}
                        >
                          {col.label}
                        </span>
                        <span className="kanban-column-count">{col.rows.length}</span>
                      </div>
                      <button
                        onClick={() => handleAddCardInColumn(col.key)}
                        className="kanban-add-btn"
                        title="Add card"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Column Cards */}
                    <div className="kanban-column-cards">
                      {col.rows.map(row => renderCard(row))}
                      <button
                        onClick={() => handleAddCardInColumn(col.key)}
                        className="kanban-quick-add-btn"
                      >
                        <Plus size={13} /> Add card
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: Weekly Stats Widget (Matches Screenshot) */}
        {hasCheckboxGoals && showStatsSidebar && (
          <div className="weekly-stats-sidebar">
            <div className="weekly-stats-card">
              {/* Stats Cover Image Header */}
              <div 
                className="weekly-stats-cover"
                style={{ 
                  backgroundImage: `url(${statsCoverImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="weekly-stats-cover-overlay">
                  <button
                    className="habit-cover-action-btn"
                    onClick={() => setStatsCoverModal(true)}
                    title="Change stats cover"
                  >
                    <ImageIcon size={12} />
                    <span>Edit Cover</span>
                  </button>
                </div>
              </div>

              {/* Stats Header */}
              <div className="weekly-stats-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame size={16} className="text-warning" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    Weekly stats
                  </span>
                </div>
              </div>

              {/* Stats Body */}
              <div className="weekly-stats-body">
                <div className="weekly-stats-section-title">This week:</div>

                <div className="weekly-stat-metric">
                  <span>Completed:</span>
                  <strong>{stats.totalCompleted} goals ✅</strong>
                </div>

                <div className="weekly-stat-metric">
                  <span>Out of:</span>
                  <strong>{stats.totalGoals} goals</strong>
                </div>

                <div className="weekly-stat-metric">
                  <span>Total progress:</span>
                  <strong>{stats.progressPercentage}%</strong>
                </div>

                {/* 10-Segment Visual Progress Bar */}
                <div className="weekly-progress-segments">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const isFilled = i < Math.round((stats.progressPercentage / 100) * 10);
                    return (
                      <div
                        key={i}
                        className={`progress-block ${isFilled ? 'filled' : 'empty'}`}
                      />
                    );
                  })}
                </div>

                {/* Daily Goal Counters & Indicator Rings */}
                <div className="weekly-daily-rings">
                  {rows.map((r) => {
                    const dayDone = checkboxProperties.filter(p => !!r.values[p.id]).length;
                    const isAllDone = dayDone > 0 && dayDone === checkboxProperties.length;
                    const dayTitle = r.values[titleProp.id] || 'Day';
                    return (
                      <div 
                        key={r.id} 
                        className="daily-ring-item" 
                        title={`${dayTitle}: ${dayDone}/${checkboxProperties.length} goals`}
                      >
                        <span className="daily-ring-count">{dayDone}</span>
                        <span className={`daily-ring-dot ${isAllDone ? 'gold' : dayDone > 0 ? 'green' : 'gray'}`}>
                          ●
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="weekly-stats-actions">
                  <button
                    className="weekly-add-page-btn"
                    onClick={() => onAddRow()}
                  >
                    <Plus size={14} />
                    <span>New page</span>
                  </button>

                  <button
                    className="weekly-reset-btn"
                    onClick={handleWeeklyReset}
                    title="Reset all habit checkboxes to start a new week"
                  >
                    <RotateCcw size={14} />
                    <span>Weekly reset</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset Feedback Toast */}
      {resetToast && (
        <div className="habit-reset-toast">
          <Sparkles size={16} />
          <span>Weekly goals reset! Ready for a powerful new week! ⚡</span>
        </div>
      )}

      {/* Card Cover Image Selector Modal */}
      {coverModalRowId && (
        <CoverImageModal
          isOpen={!!coverModalRowId}
          onClose={() => setCoverModalRowId(null)}
          currentUrl={rows.find(r => r.id === coverModalRowId)?.values.coverImage || ''}
          onSelectCover={(url) => {
            onUpdateCellImmediate(blockId, coverModalRowId, 'coverImage', url);
          }}
        />
      )}

      {/* Stats Cover Image Selector Modal */}
      {statsCoverModal && (
        <CoverImageModal
          isOpen={statsCoverModal}
          onClose={() => setStatsCoverModal(false)}
          currentUrl={statsCoverImage}
          onSelectCover={(url) => setStatsCoverImage(url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80')}
        />
      )}
    </div>
  );
}
