import { useEffect, useRef } from 'react';
import { useBlockStore } from '../../../stores/blockStore';

export default function DividerBlock({ block }) {
  const contentRef = useRef(null);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  useEffect(() => {
    if (focusBlockId === block.id && contentRef.current) {
      contentRef.current.focus();
    }
  }, [focusBlockId, block.id]);

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      deleteBlock(block.id);
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
