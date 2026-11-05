import React, { useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import EmojiIcon from '../../Common/EmojiIcon';
import IconPicker from '../../Common/IconPicker';
import { Palette, Sparkles, Check } from 'lucide-react';

const CALLOUT_PRESETS = [
  { id: 'note', label: 'Note', emoji: '💡', color: 'default' },
  { id: 'info', label: 'Info', emoji: 'ℹ️', color: 'blue_background' },
  { id: 'warning', label: 'Warning', emoji: '⚠️', color: 'orange_background' },
  { id: 'danger', label: 'Critical', emoji: '🚨', color: 'red_background' },
  { id: 'success', label: 'Verified', emoji: '✅', color: 'green_background' },
  { id: 'tip', label: 'Insight', emoji: '⚡', color: 'purple_background' },
];

const CALLOUT_COLORS = [
  { id: 'default', label: 'Default', bg: 'var(--bg-tertiary)' },
  { id: 'gray_background', label: 'Gray', bg: 'var(--block-bg-tint-gray)' },
  { id: 'brown_background', label: 'Brown', bg: 'var(--block-bg-tint-brown)' },
  { id: 'orange_background', label: 'Orange', bg: 'var(--block-bg-tint-orange)' },
  { id: 'yellow_background', label: 'Yellow', bg: 'var(--block-bg-tint-yellow)' },
  { id: 'green_background', label: 'Green', bg: 'var(--block-bg-tint-green)' },
  { id: 'blue_background', label: 'Blue', bg: 'var(--block-bg-tint-blue)' },
  { id: 'purple_background', label: 'Purple', bg: 'var(--block-bg-tint-purple)' },
  { id: 'pink_background', label: 'Pink', bg: 'var(--block-bg-tint-pink)' },
  { id: 'red_background', label: 'Red', bg: 'var(--block-bg-tint-red)' },
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
  const engine = useEditorEngine();

  const handleSelectIcon = (newEmoji: string) => {
    engine.updateBlock(block.id, {
      properties: { ...block.properties, emoji: newEmoji }
    });
    setShowIconPicker(false);
  };

  const handleSelectColor = (newColor: string) => {
    engine.updateBlock(block.id, {
      properties: { ...block.properties, color: newColor }
    });
    setShowMenu(false);
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

            {/* Custom Background Colors */}
            <div className="callout-config-section" style={{ marginTop: '8px' }}>
              <span className="callout-config-label">BACKGROUND TINT</span>
              <div className="callout-color-grid">
                {CALLOUT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`callout-color-swatch ${color === c.id ? 'active' : ''}`}
                    style={{ background: c.bg }}
                    onClick={() => handleSelectColor(c.id)}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
