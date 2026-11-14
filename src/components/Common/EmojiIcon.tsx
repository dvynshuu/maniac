import React, { memo } from 'react';
import { getVectorIcon, EMOJI_TO_VECTOR_MAP, DYNAMIC_ICONS } from './IconResolver';

interface EmojiIconProps {
  emoji?: string | null;
  size?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Unified Icon & Glyph Component.
 * Resolves both icon names ('Brain', 'FileText') and legacy emoji strings ('🧠', '📝')
 * to crisp, monochrome 1.5px stroke vector icons.
 * Gracefully falls back to native OS emoji only if unmapped and requested.
 */
function EmojiIconComponent({ emoji, size = '1em', className = '', style = {} }: EmojiIconProps) {
  if (!emoji) return null;

  const trimmed = String(emoji).trim();
  const numericSize = typeof size === 'number' ? size : parseInt(String(size), 10) || 16;

  // Check if it resolves to a vector icon (named icon or mapped emoji)
  const isVector = Boolean(DYNAMIC_ICONS[trimmed] || EMOJI_TO_VECTOR_MAP[trimmed]);

  if (isVector) {
    const VectorIcon = getVectorIcon(trimmed);
    return (
      <span
        className={`vector-icon-badge ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          lineHeight: 1,
          verticalAlign: 'middle',
          flexShrink: 0,
          color: 'currentColor',
          ...style,
        }}
      >
        <VectorIcon size={numericSize} strokeWidth={1.5} />
      </span>
    );
  }

  // Graceful fallback to native emoji glyph for unmapped opt-in emojis
  return (
    <span
      className={`native-emoji-fallback ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        lineHeight: 1,
        verticalAlign: 'middle',
        flexShrink: 0,
        fontSize: `calc(${typeof size === 'number' ? `${size}px` : size} * 0.85)`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        ...style,
      }}
    >
      {emoji}
    </span>
  );
}

export const EmojiIcon = memo(EmojiIconComponent);
export default EmojiIcon;
