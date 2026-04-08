import { usePageStore } from '../stores/pageStore';

// Simple wrapper hook (the plan outlined specific hooks, 
// so we'll wrap the Zustand store to respect the requested architecture cleanly).
export function usePages() {
  const pages = usePageStore(s => s.pages);
  const currentPageId = usePageStore(s => s.currentPageId);
  const addPage = usePageStore(s => s.addPage);
  const updatePage = usePageStore(s => s.updatePage);
  const deletePage = usePageStore(s => s.deletePage);
  const archivePage = usePageStore(s => s.archivePage);
  
  return { pages, currentPageId, addPage, updatePage, deletePage, archivePage };
}
