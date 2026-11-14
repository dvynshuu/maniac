import React, { useState } from 'react';
import { 
  Play, Plus, Check, Settings, Sparkles, Database, 
  FileText, CheckSquare, List, ChevronRight, X, Layers
} from 'lucide-react';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { Transaction } from '../../../core/editor/Transaction';
import { useDatabaseStore } from '../../../stores/databaseStore';
import { useBlockStore } from '../../../stores/blockStore';
import { usePageStore } from '../../../stores/pageStore';
import { createId } from '../../../core/ids/identity';
import { useNavigate } from 'react-router-dom';

const ICON_MAP: Record<string, React.ReactNode> = {
  Play: <Play size={14} />,
  Plus: <Plus size={14} />,
  Check: <Check size={14} />,
  Sparkles: <Sparkles size={14} />,
  Database: <Database size={14} />,
  FileText: <FileText size={14} />,
  CheckSquare: <CheckSquare size={14} />,
  List: <List size={14} />,
  Layers: <Layers size={14} />,
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  default: { bg: 'var(--color-surface-3)', text: 'var(--color-fg)', border: 'var(--color-border)' },
  blue: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  purple: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  green: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
  amber: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  rose: { bg: 'rgba(244, 63, 94, 0.15)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.3)' },
};

export default function ButtonBlock({ block }: { block: any }) {
  const engine = useEditorEngine(block.pageId);
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  const label = block.properties?.buttonLabel || 'Click Button';
  const iconName = block.properties?.buttonIcon || 'Play';
  const color = block.properties?.buttonColor || 'default';
  const actionType = block.properties?.buttonAction || 'insert_blocks';
  const payload = block.properties?.buttonPayload || {
    blocks: [
      { type: 'todo', content: 'New checklist item' }
    ]
  };

  // Form state for config modal
  const [configLabel, setConfigLabel] = useState(label);
  const [configIcon, setConfigIcon] = useState(iconName);
  const [configColor, setConfigColor] = useState(color);
  const [configAction, setConfigAction] = useState(actionType);
  const [configBlocks, setConfigBlocks] = useState<any[]>(
    payload.blocks || [{ type: 'todo', content: 'New item' }]
  );
  const [configDbId, setConfigDbId] = useState(payload.databaseId || '');

  // Available databases in workspace
  const databases = useDatabaseStore(s => Object.entries(s.databases).map(([id, db]) => ({
    id,
    title: (db as any).title || `Database (${id.slice(0, 6)})`
  })));

  const handleExecute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) return;

    setIsRunning(true);
    try {
      if (actionType === 'insert_blocks') {
        const blocksToInsert = payload.blocks && payload.blocks.length > 0 
          ? payload.blocks 
          : [{ type: 'text', content: 'New automated entry' }];

        const tx = new Transaction(engine);
        let afterId = block.id;

        for (const item of blocksToInsert) {
          const newId = createId();
          tx.createBlock(item.type, block.parentId || null, afterId, item.properties || {});
          const op = tx.ops[tx.ops.length - 1];
          op.payload.id = newId;
          op.payload.content = item.content || '';
          afterId = newId;
        }

        await tx.commit();
      } else if (actionType === 'add_row') {
        const targetDbId = payload.databaseId;
        if (targetDbId) {
          await useDatabaseStore.getState().addRow(targetDbId, payload.initialValues || {});
        } else {
          // If no specific DB specified, find the first database on the page
          const blockMap = useBlockStore.getState().blockMap;
          const firstDb = Object.values(blockMap).find(b => b.type === 'database');
          if (firstDb) {
            await useDatabaseStore.getState().addRow(firstDb.id, payload.initialValues || {});
          }
        }
      } else if (actionType === 'open_page') {
        if (payload.pageId) {
          navigate(`/app/page/${payload.pageId}`);
        } else {
          const res = await usePageStore.getState().addPage(block.pageId);
          if (res?.page?.id) {
            navigate(`/app/page/${res.page.id}`);
          }
        }
      }

      setIsDone(true);
      setTimeout(() => setIsDone(false), 1500);
    } catch (err) {
      console.error('[ButtonBlock] Action execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveConfig = () => {
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        buttonLabel: configLabel,
        buttonIcon: configIcon,
        buttonColor: configColor,
        buttonAction: configAction,
        buttonPayload: {
          blocks: configBlocks,
          databaseId: configDbId,
        }
      }
    });
    setIsConfiguring(false);
  };

  const addTemplateItem = (type: string) => {
    setConfigBlocks([...configBlocks, { type, content: type === 'heading2' ? 'Section Header' : 'New task' }]);
  };

  const removeTemplateItem = (index: number) => {
    setConfigBlocks(configBlocks.filter((_, idx) => idx !== index));
  };

  const updateTemplateContent = (index: number, content: string) => {
    const updated = [...configBlocks];
    updated[index] = { ...updated[index], content };
    setConfigBlocks(updated);
  };

  const colorStyle = COLOR_CLASSES[color] || COLOR_CLASSES.default;

  return (
    <div className="block-button-container group/btn-block">
      <div className="block-button-row">
        <button
          type="button"
          onClick={handleExecute}
          disabled={isRunning}
          className={`block-action-btn ${isDone ? 'done' : ''}`}
          style={{
            backgroundColor: colorStyle.bg,
            color: colorStyle.text,
            borderColor: colorStyle.border,
          }}
        >
          <span className="block-action-icon">
            {isDone ? <Check size={14} className="text-emerald-400" /> : (ICON_MAP[iconName] || <Play size={14} />)}
          </span>
          <span className="block-action-label">{label}</span>
        </button>

        <button
          type="button"
          className="block-btn-config-trigger"
          onClick={() => setIsConfiguring(true)}
          title="Configure button automation"
        >
          <Settings size={13} />
        </button>
      </div>

      {/* Configuration Modal */}
      {isConfiguring && (
        <div className="block-btn-config-popover" onClick={(e) => e.stopPropagation()}>
          <div className="block-btn-config-header">
            <span className="title">Configure Action Button</span>
            <button type="button" onClick={() => setIsConfiguring(false)} className="close-btn">
              <X size={14} />
            </button>
          </div>

          <div className="block-btn-config-body">
            {/* Button Label */}
            <div className="config-field">
              <label>Button Label</label>
              <input
                type="text"
                value={configLabel}
                onChange={(e) => setConfigLabel(e.target.value)}
                placeholder="Button label..."
              />
            </div>

            {/* Icon & Color Row */}
            <div className="config-row-2">
              <div className="config-field">
                <label>Icon</label>
                <select value={configIcon} onChange={(e) => setConfigIcon(e.target.value)}>
                  {Object.keys(ICON_MAP).map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div className="config-field">
                <label>Color Accent</label>
                <select value={configColor} onChange={(e) => setConfigColor(e.target.value)}>
                  {Object.keys(COLOR_CLASSES).map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Type */}
            <div className="config-field">
              <label>Automation Action</label>
              <select value={configAction} onChange={(e) => setConfigAction(e.target.value)}>
                <option value="insert_blocks">Insert blocks below button</option>
                <option value="add_row">Add new row to database</option>
                <option value="open_page">Create & open new page</option>
              </select>
            </div>

            {/* Action-specific fields */}
            {configAction === 'insert_blocks' && (
              <div className="config-blocks-section">
                <label className="section-title">Blocks to insert:</label>
                <div className="config-block-list">
                  {configBlocks.map((b, idx) => (
                    <div key={idx} className="config-block-item">
                      <span className="item-type">{b.type}</span>
                      <input
                        type="text"
                        value={b.content || ''}
                        onChange={(e) => updateTemplateContent(idx, e.target.value)}
                        placeholder="Default content..."
                      />
                      <button type="button" onClick={() => removeTemplateItem(idx)} className="item-del">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-block-pills">
                  <button type="button" onClick={() => addTemplateItem('todo')}>+ Todo</button>
                  <button type="button" onClick={() => addTemplateItem('text')}>+ Text</button>
                  <button type="button" onClick={() => addTemplateItem('heading2')}>+ Heading</button>
                  <button type="button" onClick={() => addTemplateItem('callout')}>+ Callout</button>
                </div>
              </div>
            )}

            {configAction === 'add_row' && (
              <div className="config-field">
                <label>Target Database</label>
                <select value={configDbId} onChange={(e) => setConfigDbId(e.target.value)}>
                  <option value="">First database on current page</option>
                  {databases.map(db => (
                    <option key={db.id} value={db.id}>{db.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="block-btn-config-footer">
            <button type="button" className="config-btn-cancel" onClick={() => setIsConfiguring(false)}>
              Cancel
            </button>
            <button type="button" className="config-btn-save" onClick={handleSaveConfig}>
              Save Automation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
