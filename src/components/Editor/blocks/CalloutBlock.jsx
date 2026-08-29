import { useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import EmojiIcon from '../../Common/EmojiIcon';
import IconPicker from '../../Common/IconPicker';
import { Palette } from 'lucide-react';

const CALLOUT_COLORS = [
  { id: 'default', label: 'Default', bg: 'var(--bg-hover)' },
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

function ActiveCalloutBlock({ block }) {
  const editor = useBlockEditor(block, {
    placeholder: 'Callout text...',
    newBlockType: 'text',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="block-callout-content" />;
}

export default function CalloutBlock({ block }) {
  const emoji = block.properties?.emoji || '💡';
  const color = block.properties?.color || 'default';
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const engine = useEditorEngine();

  const handleSelectIcon = (newEmoji) => {
    engine.updateBlock(block.id, {
      properties: { ...block.properties, emoji: newEmoji }
    });
    setShowIconPicker(false);
  };

  const handleSelectColor = (newColor) => {
    engine.updateBlock(block.id, {
      properties: { ...block.properties, color: newColor }
    });
    setShowColorMenu(false);
  };

  return (
    <div className="block-callout group/callout" data-color={color} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <button
          className="block-callout-emoji-btn"
          onClick={() => setShowIconPicker(!showIconPicker)}
          title="Click to change icon"
          contentEditable={false}
        >
          <EmojiIcon emoji={emoji} size="20px" />
        </button>

        {showIconPicker && (
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000 }}>
            <IconPicker
              onSelect={handleSelectIcon}
              onClose={() => setShowIconPicker(false)}
            />
          </div>
        )}
      </div>

      <ActiveCalloutBlock block={block} />

      {/* Color tint switcher trigger */}
      <div className="block-callout-actions" contentEditable={false}>
        <button
          className="block-callout-palette-btn"
          onClick={() => setShowColorMenu(!showColorMenu)}
          title="Change background color"
        >
          <Palette size={13} />
        </button>

        {showColorMenu && (
          <div className="block-callout-color-dropdown">
            <div className="callout-color-dropdown-title">Color Tint</div>
            <div className="callout-color-grid">
              {CALLOUT_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`callout-color-option ${color === c.id ? 'active' : ''}`}
                  style={{ background: c.bg }}
                  onClick={() => handleSelectColor(c.id)}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
