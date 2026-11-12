import React, { useState, useCallback, useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { useBlockEditor, UseBlockEditorOptions } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../../stores/pageStore';
import { useUIStore } from '../../../stores/uiStore';
import SlashMenu from '../SlashMenu';
import MentionMenu from '../MentionMenu';

export interface UniversalTextEditorProps {
  block: any;
  placeholder?: string;
  className?: string;
  newBlockType?: string;
  backspaceAction?: 'delete' | 'merge' | 'convert' | 'none';
  enableMenus?: boolean;
}

/**
 * UniversalTextEditor — Consolidated rich-text editing surface for all text block variants.
 * Centralizes SlashMenu, MentionMenu, block-splitting, merging, and keyboard shortcuts.
 */
export default function UniversalTextEditor({
  block,
  placeholder = "Type '/' for commands or '@' to mention",
  className = 'block-text',
  newBlockType = 'text',
  backspaceAction = 'delete',
  enableMenus = true,
}: UniversalTextEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  const engine = useEditorEngine(block.pageId);
  const navigate = useNavigate();

  const editor = useBlockEditor(block, {
    placeholder,
    newBlockType,
    backspaceAction,
    onEnter: () => {
      if (showSlashMenu || showMentionMenu) return false;
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
          return;
        }
      }

      setShowSlashMenu(false);
      setShowMentionMenu(false);
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
    </div>
  );
}
