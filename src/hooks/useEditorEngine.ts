import { useMemo } from 'react';
import { EditorEngine } from '../core/editor/Engine';
import { useParams } from 'react-router-dom';
import { getActorId } from '../db/actorId';

/**
 * ─── Hook: useEditorEngine ──────────────────────────────────────
 * Provides the singleton EditorEngine instance for the current page context.
 */
export function useEditorEngine(overridePageId?: string) {
  const { pageId: paramPageId } = useParams();
  const pageId = overridePageId || paramPageId || '';
  
  const engine = useMemo(() => {
    return new EditorEngine(pageId, getActorId());
  }, [pageId]);

  return engine;
}
