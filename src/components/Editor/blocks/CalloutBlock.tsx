import React, { useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import EmojiIcon from '../../Common/EmojiIcon';
import IconPicker from '../../Common/IconPicker';
import { Palette, Sparkles, Check } from 'lucide-react';

const CALLOUT_PRESETS = [
  { id: 'note', label: 'Note', emoji: '💡', color: 'default' },
  { id: 'info', label: 'Info', emoji: 'ℹ️', color: 'default' },
  { id: 'warning', label: 'Warning', emoji: '⚠️', color: 'default' },
  { id: 'danger', label: 'Critical', emoji: '🚨', color: 'default' },
  { id: 'success', label: 'Verified', emoji: '✅', color: 'default' },
  { id: 'tip', label: 'Insight', emoji: '⚡', color: 'default' },
];

function ActiveCalloutBlock({ block }: { block: any }) {
  const editor = useBlockEditor(block, {
    placeholder: 'Callout text or instructions...',
    newBlockType: 'text',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="block-callout-content" />;
}

export default function CalloutBlock({ block }: { block: any }) {
  const emoji = block.properties?.emoji || '💡';
  const color = block.properties?.color || 'default';
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const engine = useEditorEngine(block.pageId);

  const handleSelectIcon = (newEmoji: string) => {
    engine.updateBlock(block.id, {
      properties: { ...block.properties, emoji: newEmoji }
    });
    setShowIconPicker(false);
  };

  const handleSelectPreset = (preset: typeof CALLOUT_PRESETS[0]) => {
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        emoji: preset.emoji,
        color: preset.color
      }
    });
    setShowMenu(false);
  };

  return (
    <div className={`block-callout group/callout ${color ? `callout-tint-${color}` : ''}`} data-color={color}>
      {/* Callout Icon Box */}
      <div className="block-callout-icon-col" contentEditable={false}>
        <button
          type="button"
          className="block-callout-emoji-btn"
          onClick={() => setShowIconPicker(!showIconPicker)}
          title="Click to change callout icon"
        >
          <EmojiIcon emoji={emoji} size="20px" />
        </button>

        {showIconPicker && (
          <div className="callout-icon-picker-dropdown">
            <IconPicker
              onSelect={handleSelectIcon}
              onClose={() => setShowIconPicker(false)}
            />
          </div>
        )}
      </div>

      {/* Editable Text Body */}
      <ActiveCalloutBlock block={block} />

      {/* Quick Config Palette Button */}
      <div className="block-callout-actions" contentEditable={false}>
        <button
          type="button"
          className="block-callout-palette-btn"
          onClick={() => setShowMenu(!showMenu)}
          title="Customize Callout preset and color tint"
        >
          <Palette size={13} />
        </button>

        {showMenu && (
          <div className="callout-config-dropdown">
            {/* Semantic Presets */}
            <div className="callout-config-section">
              <span className="callout-config-label">PRESETS</span>
              <div className="callout-presets-list">
                {CALLOUT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="callout-preset-pill"
                    onClick={() => handleSelectPreset(p)}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
