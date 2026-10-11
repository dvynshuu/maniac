import { useEffect, useRef } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useEditorEngine } from '../../../hooks/useEditorEngine';

export default function DividerBlock({ block }: { block: any }) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const engine = useEditorEngine();
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  useEffect(() => {
    if (focusBlockId === block.id && contentRef.current) {
      contentRef.current.focus();
    }
  }, [focusBlockId, block.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      engine.deleteBlock(block.id);
    }
  };

  return (
    <div
      ref={contentRef}
      className="block-divider-container"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: 'none', padding: '10px 0' }}
    >
      <hr className="block-divider" />
    </div>
  );
}
