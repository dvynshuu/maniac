import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { EditorContent } from '@tiptap/react';
import { useBlockEditor, UseBlockEditorOptions } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../../stores/pageStore';
import { useUIStore } from '../../../stores/uiStore';
import { useBlockStore } from '../../../stores/blockStore';
import { parseHtmlToRichText, renderRichTextToVDOM } from '../../../utils/richTextParser';
import SlashMenu from '../SlashMenu';
import MentionMenu from '../MentionMenu';
import BlockTransclusionMenu from '../BlockTransclusionMenu';

export interface UniversalTextEditorProps {
  block: any;
  placeholder?: string;
  className?: string;
  newBlockType?: string;
  backspaceAction?: 'delete' | 'merge' | 'convert' | 'none';
  enableMenus?: boolean;
  onEnter?: (editor: any) => boolean | void;
  onBackspace?: (editor: any) => boolean | void;
}

interface ReadonlyBlockViewProps {
  content?: string;
  placeholder?: string;
  className?: string;
  onActivate: (offset?: number | 'start' | 'end') => void;
}

/**
 * Lightweight read-only block representation.
 * Renders pure React VDOM via richTextParser with zero ProseMirror or TipTap overhead.
 */
const ReadonlyBlockView = React.memo(function ReadonlyBlockView({
  content,
  placeholder = "Type '/' for commands or '@' to mention",
  className = 'block-text',
  onActivate,
}: ReadonlyBlockViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const spans = useMemo(() => {
    return parseHtmlToRichText(content);
  }, [content]);

  const isEmpty = !content || spans.length === 0 || (spans.length === 1 && !spans[0].text.trim());

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    const target = e.target as HTMLElement;
    // Don't focus editor if clicking directly on link or interactive chip
    if (target.closest('.transclusion-chip') || target.closest('.page-mention') || target.closest('a')) {
      return;
    }

    let offset: number | 'end' = 'end';
    try {
      const selection = window.getSelection();
      if (selection && selection.anchorNode && containerRef.current?.contains(selection.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(containerRef.current);
        range.setEnd(selection.anchorNode, selection.anchorOffset);
        const textBefore = range.toString();
        offset = Math.max(1, textBefore.length + 1);
      }
    } catch {
      offset = 'end';
    }

    onActivate(offset);
  }, [onActivate]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', cursor: 'text' }}
      className="readonly-block-surface"
      onClick={handleClick}
    >
      <div className={className}>
        <div className="tiptap-editor ProseMirror read-only-prosemirror" contentEditable={false}>
          {isEmpty ? (
            <p className="is-editor-empty is-empty" data-placeholder={placeholder}>
              <br className="ProseMirror-trailingBreak" />
            </p>
          ) : (
            <p>{renderRichTextToVDOM(spans)}</p>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * ActiveBlockEditor — Heavy ProseMirror/TipTap instance mounted only
 * when a block is actively focused or in the 1-block pre-warmed pool.
 */
function ActiveBlockEditor({
  block,
  placeholder = "Type '/' for commands or '@' to mention",
  className = 'block-text',
  newBlockType = 'text',
  backspaceAction = 'delete',
  enableMenus = true,
  onEnter,
  onBackspace,
}: UniversalTextEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showTransclusionMenu, setShowTransclusionMenu] = useState(false);
  const [transclusionQuery, setTransclusionQuery] = useState('');

  const engine = useEditorEngine(block.pageId);
  const navigate = useNavigate();

  const editor = useBlockEditor(block, {
    placeholder,
    newBlockType,
    backspaceAction,
    onEnter: (ed: any) => {
      if (showSlashMenu || showMentionMenu || showTransclusionMenu) return false;
      if (onEnter) return onEnter(ed);
      return undefined;
    },
    onBackspace: (ed: any) => {
      if (onBackspace) return onBackspace(ed);
      return undefined;
    },
  });

  useEffect(() => {
    if (!editor || !enableMenus) return;

    const handleUpdate = () => {
      const { selection, doc } = editor.state;
      const pos = selection.from;
      const textBefore = doc.textBetween(Math.max(0, pos - 50), pos, ' ', ' ');

      if (textBefore.includes('/')) {
        const lastSlashIndex = textBefore.lastIndexOf('/');
        const query = textBefore.substring(lastSlashIndex + 1);
        if (!query.includes(' ')) {
          setSlashQuery(query);
          setShowSlashMenu(true);
          setShowMentionMenu(false);
          setShowTransclusionMenu(false);
          return;
        }
      }

      if (textBefore.includes('((')) {
        const lastTriggerIndex = textBefore.lastIndexOf('((');
        const query = textBefore.substring(lastTriggerIndex + 2);
        if (!query.includes(')')) {
          setTransclusionQuery(query);
          setShowTransclusionMenu(true);
          setShowSlashMenu(false);
          setShowMentionMenu(false);
          return;
        }
      }

      if (textBefore.includes('@') || textBefore.includes('[[')) {
        const trigger = textBefore.includes('@') ? '@' : '[[';
        const lastTriggerIndex = textBefore.lastIndexOf(trigger);
        const query = textBefore.substring(lastTriggerIndex + trigger.length);
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setShowMentionMenu(true);
          setShowSlashMenu(false);
          setShowTransclusionMenu(false);
          return;
        }
      }

      setShowSlashMenu(false);
      setShowMentionMenu(false);
      setShowTransclusionMenu(false);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, enableMenus]);

  const handleSelectSlashItem = useCallback((type: string, options?: any) => {
    if (!editor) return;
    const text = editor.getText();
    const lastSlashIndex = text.lastIndexOf('/');
    const beforeSlash = text.substring(0, lastSlashIndex);
    (editor.commands.setContent as any)(beforeSlash ? `<p>${beforeSlash}</p>` : '', false);
    engine.updateBlock(block.id, { content: beforeSlash ? `<p>${beforeSlash}</p>` : '' });

    if (options && options.action === 'create_columns') {
      engine.createColumns(block.id, options.count);
      if (!beforeSlash || beforeSlash.trim() === '') {
        engine.deleteBlock(block.id);
      }
    } else {
      engine.convertType(block.id, type).then((results: any) => {
        if (type === 'page' && results && results[0]?.returnValue) {
          const newPage = results[0].returnValue;
          useUIStore.getState().setPageExpanded(block.pageId, true);
          usePageStore.getState().setCurrentPage(newPage.id);
          navigate(`/app/page/${newPage.id}`);
        }
      });
    }
    setShowSlashMenu(false);
  }, [editor, block.id, block.pageId, engine, navigate]);

  const handleSelectMention = useCallback((page: any) => {
    if (!editor) return;
    const text = editor.getText();
    const trigger = text.includes('@') ? '@' : '[[';
    const lastTriggerIndex = text.lastIndexOf(trigger);
    const beforeTrigger = text.substring(0, lastTriggerIndex);

    const mentionHtml = `<a class="page-mention" href="/app/page/${page.id}" data-page-id="${page.id}" contenteditable="false"><span class="mention-icon">${page.icon || '📄'}</span><span class="mention-label">${page.title || 'Untitled'}</span></a>`;
    const newHtml = `<p>${beforeTrigger}${mentionHtml}&nbsp;</p>`;

    (editor.commands.setContent as any)(newHtml, false);
    engine.updateBlock(block.id, { content: newHtml });
    setShowMentionMenu(false);
    editor.commands.focus('end');
  }, [editor, block.id, engine]);

  const handleSelectTransclusion = useCallback((targetBlock: any, snippet: string) => {
    if (!editor) return;
    const text = editor.getText();
    const lastTriggerIndex = text.lastIndexOf('((');
    const beforeTrigger = text.substring(0, lastTriggerIndex);

    const safeSnippet = snippet.length > 50 ? `${snippet.substring(0, 47)}...` : snippet;
    const transclusionHtml = `<span class="transclusion-chip" data-transclusion="" data-block-id="${targetBlock.id}" data-page-id="${targetBlock.pageId}" data-text="${safeSnippet}" data-block-type="${targetBlock.type}" contenteditable="false" title="Transcluded from ${targetBlock.pageId}">⎘ ${safeSnippet}</span>`;
    const newHtml = `<p>${beforeTrigger}${transclusionHtml}&nbsp;</p>`;

    (editor.commands.setContent as any)(newHtml, false);
    engine.updateBlock(block.id, { content: newHtml });
    setShowTransclusionMenu(false);
    editor.commands.focus('end');
  }, [editor, block.id, engine]);

  if (!editor) return null;

  return (
    <div style={{ position: 'relative' }}>
      <EditorContent editor={editor} className={className} />
      {showSlashMenu && (
        <SlashMenu
          editor={editor}
          query={slashQuery}
          onSelect={handleSelectSlashItem}
          onClose={() => setShowSlashMenu(false)}
        />
      )}
      {showMentionMenu && (
        <MentionMenu
          editor={editor}
          query={mentionQuery}
          onSelect={handleSelectMention}
          onClose={() => setShowMentionMenu(false)}
        />
      )}
      {showTransclusionMenu && (
        <BlockTransclusionMenu
          editor={editor}
          query={transclusionQuery}
          currentBlockId={block.id}
          onSelect={handleSelectTransclusion}
          onClose={() => setShowTransclusionMenu(false)}
        />
      )}
    </div>
  );
}

/**
 * UniversalTextEditor — Consolidated rich-text editing surface for all text block variants.
 * Employs a single active editor architecture:
 * - Unfocused blocks render lightweight read-only React VDOM via richTextParser.
 * - Only the actively focused block + 1 pre-warmed adjacent block mount heavy TipTap/ProseMirror instances.
 */
export default function UniversalTextEditor(props: UniversalTextEditorProps) {
  const { block } = props;
  const isFocused = useBlockStore(useCallback(s => s.focusBlockId === block.id, [block.id]));
  const isPrewarmed = useBlockStore(useCallback(s => s.prewarmedBlockId === block.id, [block.id]));
  const isMounted = isFocused || isPrewarmed;

  const handleActivate = useCallback((offset?: number | 'start' | 'end') => {
    useBlockStore.getState().setFocusBlock(block.id, offset ?? 'end', 'down');
  }, [block.id]);

  if (isMounted) {
    return <ActiveBlockEditor {...props} />;
  }

  return (
    <ReadonlyBlockView
      content={block.content}
      placeholder={props.placeholder}
      className={props.className}
      onActivate={handleActivate}
    />
  );
}
