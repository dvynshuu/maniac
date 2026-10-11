import { useMemo } from 'react';
import { EditorEngine } from '../core/editor/Engine';
import { useParams } from 'react-router-dom';

/**
 * ─── Hook: useEditorEngine ──────────────────────────────────────
 * Provides the singleton EditorEngine instance for the current page context.
 */
export function useEditorEngine() {
  const { pageId } = useParams();
  
  const engine = useMemo(() => {
    return new EditorEngine(pageId);
  }, [pageId]);

  return engine;
}
