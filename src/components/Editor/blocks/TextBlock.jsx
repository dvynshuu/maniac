import { useRef, useState, useCallback, useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import SlashMenu from '../SlashMenu';
import MentionMenu from '../MentionMenu';

export default function TextBlock({ block, index }) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const engine = useEditorEngine();

  const editor = useBlockEditor(block, {
    placeholder: "Type '/' for commands or '@' to mention",
    newBlockType: 'text',
    backspaceAction: 'delete',
    onEnter: (ed) => {
      if (showSlashMenu || showMentionMenu) return false; // let menu handle
      return undefined; // use default behavior
    },
  });

  // Track slash and mention triggers from the editor's text
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const text = editor.getText();

      if (text.includes('/')) {
        const lastSlashIndex = text.lastIndexOf('/');
        const query = text.substring(lastSlashIndex + 1);
        if (!query.includes(' ')) {
          setSlashQuery(query);
          setShowSlashMenu(true);
          setShowMentionMenu(false);
          return;
        }
      }
      
      if (text.includes('@') || text.includes('[[')) {
        const trigger = text.includes('@') ? '@' : '[[';
        const lastTriggerIndex = text.lastIndexOf(trigger);
        const query = text.substring(lastTriggerIndex + trigger.length);
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
    return () => editor.off('update', handleUpdate);
  }, [editor]);

  const handleSelectSlashItem = useCallback((type) => {
    if (!editor) return;
    const text = editor.getText();
    const lastSlashIndex = text.lastIndexOf('/');
    // Remove slash and query from content
    const beforeSlash = text.substring(0, lastSlashIndex);
    editor.commands.setContent(beforeSlash ? `<p>${beforeSlash}</p>` : '', false);
    engine.updateBlock(block.id, { content: beforeSlash ? `<p>${beforeSlash}</p>` : '' });
    engine.convertType(block.id, type);
    setShowSlashMenu(false);
  }, [editor, block.id, engine]);

  const handleSelectMention = useCallback((page) => {
    if (!editor) return;
    const text = editor.getText();
    const trigger = text.includes('@') ? '@' : '[[';
    const lastTriggerIndex = text.lastIndexOf(trigger);
    const beforeTrigger = text.substring(0, lastTriggerIndex);

    const mentionHtml = `<a class="page-mention" href="/page/${page.id}" data-page-id="${page.id}" contenteditable="false"><span class="mention-icon">${page.icon || '📄'}</span><span class="mention-label">${page.title || 'Untitled'}</span></a>`;
    const newHtml = `<p>${beforeTrigger}${mentionHtml}&nbsp;</p>`;

    editor.commands.setContent(newHtml, false);
    engine.updateBlock(block.id, { content: newHtml });
    setShowMentionMenu(false);
    editor.commands.focus('end');
  }, [editor, block.id, engine]);

  if (!editor) return null;

  return (
    <div style={{ position: 'relative' }}>
      <EditorContent editor={editor} className="block-text" />
      {showSlashMenu && (
        <SlashMenu
          query={slashQuery}
          onSelect={handleSelectSlashItem}
          onClose={() => setShowSlashMenu(false)}
        />
      )}
      {showMentionMenu && (
        <MentionMenu
          query={mentionQuery}
          onSelect={handleSelectMention}
          onClose={() => setShowMentionMenu(false)}
        />
      )}
    </div>
  );
}
