import { useState, useEffect, useRef } from 'react';
import { EMOJIS } from '../../utils/constants';
import EmojiIcon from './EmojiIcon';

const CURATED_VECTOR_ICONS = [
  'FileText', 'Brain', 'Landmark', 'Target', 'Database', 'Table', 'Terminal', 'Code',
  'Zap', 'Flame', 'BookOpen', 'Calendar', 'Clock', 'Compass', 'Layers', 'Shield',
  'Workflow', 'Cpu', 'Rocket', 'Star', 'Folder', 'Key', 'Trophy', 'Bot',
  'Gem', 'Smartphone', 'Monitor', 'Camera', 'Lock', 'Tag', 'Sparkles', 'CheckCircle2'
];

interface IconPickerProps {
  onSelect: (iconOrEmoji: string) => void;
  onClose: () => void;
}

export default function IconPicker({ onSelect, onClose }: IconPickerProps) {
  const [activeTab, setActiveTab] = useState<'icons' | 'emojis'>('icons');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Small delay so the click that opened it doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="icon-picker" ref={pickerRef} role="dialog" aria-label="Icon Picker">
      {/* Tab Switcher: Icons (Default 1.5px Monochrome) vs Native Emojis (Opt-in) */}
      <div 
        style={{
          display: 'flex',
          gap: '4px',
          padding: '2px',
          background: 'var(--surface-canvas, #000000)',
          border: '1px solid var(--border-hairline, rgba(255, 255, 255, 0.08))',
          borderRadius: '6px',
          marginBottom: '10px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('icons')}
          style={{
            flex: 1,
            padding: '5px 8px',
            fontSize: '11px',
            fontWeight: activeTab === 'icons' ? 600 : 500,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: activeTab === 'icons' ? 'var(--surface-elevated, #161616)' : 'transparent',
            color: activeTab === 'icons' ? 'var(--text-primary, #ededed)' : 'var(--text-muted, #888888)',
            border: activeTab === 'icons' ? '1px solid var(--border-hairline, rgba(255, 255, 255, 0.12))' : '1px solid transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 120ms ease'
          }}
        >
          Vector Icons
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('emojis')}
          style={{
            flex: 1,
            padding: '5px 8px',
            fontSize: '11px',
            fontWeight: activeTab === 'emojis' ? 600 : 500,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: activeTab === 'emojis' ? 'var(--surface-elevated, #161616)' : 'transparent',
            color: activeTab === 'emojis' ? 'var(--text-primary, #ededed)' : 'var(--text-muted, #888888)',
            border: activeTab === 'emojis' ? '1px solid var(--border-hairline, rgba(255, 255, 255, 0.12))' : '1px solid transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 120ms ease'
          }}
        >
          Native Emojis
        </button>
      </div>

      {activeTab === 'icons' ? (
        <div className="icon-picker-grid">
          {CURATED_VECTOR_ICONS.map((iconName) => (
            <button
              key={iconName}
              type="button"
              className="icon-picker-item"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(iconName);
              }}
              title={iconName}
              style={{
                color: 'var(--text-primary, #ededed)',
              }}
            >
              <EmojiIcon emoji={iconName} size="18px" />
            </button>
          ))}
        </div>
      ) : (
        <div className="icon-picker-grid">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="icon-picker-item"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(emoji);
              }}
              title={emoji}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
