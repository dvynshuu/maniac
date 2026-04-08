import { useBlockStore } from '../stores/blockStore';

export function useBlocks() {
  const blocks = useBlockStore(s => s.blocks);
  const loadBlocks = useBlockStore(s => s.loadBlocks);
  const addBlock = useBlockStore(s => s.addBlock);
  const updateBlock = useBlockStore(s => s.updateBlock);
  const deleteBlock = useBlockStore(s => s.deleteBlock);
  
  return { blocks, loadBlocks, addBlock, updateBlock, deleteBlock };
}
