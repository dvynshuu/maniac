import React, { useState } from 'react';
import { 
  CopyPlus, Plus, Settings, Check, Trash2, X, 
  ChevronRight, Sparkles, FileText, CheckSquare, AlertCircle 
} from 'lucide-react';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { Transaction } from '../../../core/editor/Transaction';
import { createId } from '../../../core/ids/identity';
import { useBlockStore } from '../../../stores/blockStore';
import EmojiIcon from '../../Common/EmojiIcon';

const PRESET_TEMPLATES = [
  {
    name: 'Daily Standup',
    icon: '☀️',
    blocks: [
      { type: 'heading2', content: 'Daily Standup — ' + new Date().toLocaleDateString() },
      { type: 'callout', content: 'Focus of the day: High leverage execution.', properties: { emoji: '🎯' } },
      { type: 'heading3', content: 'What was accomplished yesterday?' },
      { type: 'bullet', content: '' },
      { type: 'heading3', content: 'What is planned for today?' },
      { type: 'todo', content: 'Review pull requests' },
      { type: 'todo', content: 'Core feature development' },
      { type: 'heading3', content: 'Blockers / Need Help' },
      { type: 'bullet', content: 'None' },
    ]
  },
  {
    name: '1-on-1 Meeting',
    icon: '🤝',
    blocks: [
      { type: 'heading2', content: '1-on-1 Sync' },
      { type: 'todo', content: 'Review quarterly goals & deliverables' },
      { type: 'todo', content: 'Discuss engineering challenges & roadblocks' },
      { type: 'todo', content: 'Action items for next sprint' },
    ]
  },
  {
    name: 'Bug Report',
    icon: '🐛',
    blocks: [
      { type: 'heading2', content: 'Bug Report: [Summary]' },
      { type: 'callout', content: 'Severity: High | Environment: Production', properties: { emoji: '⚠️' } },
      { type: 'heading3', content: 'Steps to Reproduce' },
      { type: 'numbered', content: 'Navigate to page' },
      { type: 'numbered', content: 'Click trigger button' },
      { type: 'heading3', content: 'Expected vs Actual Behavior' },
      { type: 'bullet', content: 'Expected: State persists cleanly' },
      { type: 'bullet', content: 'Actual: Uncaught error in console' },
    ]
  }
];

export default function TemplateBlock({ block }: { block: any }) {
  const engine = useEditorEngine(block.pageId);
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  const title = block.properties?.templateTitle || 'Add New Entry';
  const icon = block.properties?.templateIcon || '📝';
  const templateBlocks: any[] = block.properties?.templateBlocks || PRESET_TEMPLATES[0].blocks;

  const [isInserting, setIsInserting] = useState(false);
  const [justInserted, setJustInserted] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Configuration state
  const [cfgTitle, setCfgTitle] = useState(title);
  const [cfgIcon, setCfgIcon] = useState(icon);
  const [cfgBlocks, setCfgBlocks] = useState<any[]>(templateBlocks);

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInserting) return;

    setIsInserting(true);
    try {
      const tx = new Transaction(engine);
      let afterId = block.id;

      for (const item of templateBlocks) {
        const newId = createId();
        tx.createBlock(item.type, block.parentId || null, afterId, item.properties || {});
        const op = tx.ops[tx.ops.length - 1];
        op.payload.id = newId;
        op.payload.content = item.content || '';
        afterId = newId;
      }

      await tx.commit();
      setJustInserted(true);
      setTimeout(() => setJustInserted(false), 1500);
    } catch (err) {
      console.error('[TemplateBlock] Clone failed:', err);
    } finally {
      setIsInserting(false);
    }
  };

  const handleSaveConfig = () => {
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        templateTitle: cfgTitle,
        templateIcon: cfgIcon,
        templateBlocks: cfgBlocks,
      }
    });
    setIsConfiguring(false);
  };

  const applyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setCfgTitle(preset.name);
    setCfgIcon(preset.icon);
    setCfgBlocks(preset.blocks);
  };

  const addBlockToConfig = (type: string) => {
    setCfgBlocks([...cfgBlocks, { type, content: '', properties: {} }]);
  };

  const removeBlockFromConfig = (idx: number) => {
    setCfgBlocks(cfgBlocks.filter((_, i) => i !== idx));
  };

  const updateBlockContent = (idx: number, content: string) => {
    const updated = [...cfgBlocks];
    updated[idx] = { ...updated[idx], content };
    setCfgBlocks(updated);
  };

  return (
    <div 
      className="block-template-container group/tpl-block"
      tabIndex={0}
      style={{
        outline: focusBlockId === block.id ? '2px solid var(--accent-primary, #6366f1)' : 'none'
      }}
    >
      <div className="block-template-card">
        <button
          type="button"
          className={`block-template-trigger-btn ${justInserted ? 'inserted' : ''}`}
          onClick={handleDuplicate}
          disabled={isInserting}
        >
          <span className="block-template-icon">
            {justInserted ? (
              <Check size={16} className="text-emerald-400" />
            ) : (
              <EmojiIcon emoji={icon} size="16px" />
            )}
          </span>
          <span className="block-template-label">
            {justInserted ? 'Added to page!' : `+ ${title}`}
          </span>
          <span className="block-template-count">
            ({templateBlocks.length} blocks)
          </span>
        </button>

        <button
          type="button"
          className="block-template-settings-btn"
          onClick={() => setIsConfiguring(true)}
          title="Configure inline template"
        >
          <Settings size={13} />
        </button>
      </div>

      {/* Configuration Popover */}
      {isConfiguring && (
        <div className="block-template-config-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="title-row">
              <CopyPlus size={15} />
              <span>Configure Inline Template</span>
            </div>
            <button type="button" onClick={() => setIsConfiguring(false)} className="close-btn">
              <X size={14} />
            </button>
          </div>

          <div className="modal-body">
            {/* Presets Bar */}
            <div className="config-presets-bar">
              <span className="presets-label">Quick Presets:</span>
              <div className="presets-buttons">
                {PRESET_TEMPLATES.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="preset-chip"
                  >
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Header Fields */}
            <div className="config-row-2">
              <div className="config-field">
                <label>Template Name</label>
                <input
                  type="text"
                  value={cfgTitle}
                  onChange={(e) => setCfgTitle(e.target.value)}
                  placeholder="e.g. Daily Standup..."
                />
              </div>

              <div className="config-field" style={{ maxWidth: '90px' }}>
                <label>Icon</label>
                <input
                  type="text"
                  value={cfgIcon}
                  onChange={(e) => setCfgIcon(e.target.value)}
                  maxLength={2}
                  style={{ textAlign: 'center' }}
                />
              </div>
            </div>

            {/* Template Blocks List */}
            <div className="config-blocks-list-header">
              <label>Blocks in template ({cfgBlocks.length}):</label>
            </div>

            <div className="config-blocks-scroll">
              {cfgBlocks.map((b, idx) => (
                <div key={idx} className="config-block-row">
                  <span className="badge-type">{b.type}</span>
                  <input
                    type="text"
                    value={b.content || ''}
                    onChange={(e) => updateBlockContent(idx, e.target.value)}
                    placeholder={`Initial ${b.type} text...`}
                  />
                  <button
                    type="button"
                    onClick={() => removeBlockFromConfig(idx)}
                    className="row-del-btn"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Block Quick Bar */}
            <div className="config-add-bar">
              <span className="text-2xs text-tertiary">Add block to template:</span>
              <div className="add-chips">
                <button type="button" onClick={() => addBlockToConfig('heading2')}>+ H2</button>
                <button type="button" onClick={() => addBlockToConfig('heading3')}>+ H3</button>
                <button type="button" onClick={() => addBlockToConfig('todo')}>+ Todo</button>
                <button type="button" onClick={() => addBlockToConfig('bullet')}>+ Bullet</button>
                <button type="button" onClick={() => addBlockToConfig('text')}>+ Text</button>
                <button type="button" onClick={() => addBlockToConfig('callout')}>+ Callout</button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={() => setIsConfiguring(false)}>
              Cancel
            </button>
            <button type="button" className="btn-save" onClick={handleSaveConfig}>
              Save Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
