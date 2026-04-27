import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useBlockStore } from '../stores/blockStore';
import { useUndoStore } from '../stores/undoStore';
import { debounce } from '../utils/helpers';
import { sanitize } from '../utils/sanitizer';

/**
 * useBlockEditor — the shared TipTap integration for all editable block types.
 * Handles: editor instance creation, focus management, debounced persistence,
 * undo tracking, and keyboard shortcuts (Enter to create new block, Backspace to delete).
 *
 * @param {object} block - The block data from the store
 * @param {object} options
 * @param {string} options.placeholder - Placeholder text
 * @param {string} options.newBlockType - Block type to create on Enter (default: 'text')
 * @param {string} options.backspaceAction - 'delete' | 'convert' (default: 'delete')
 * @param {boolean} options.multiline - Allow Shift+Enter line breaks (default: false for headings, true for text)
 * @param {Function} options.onEnter - Custom Enter handler (overrides default)
 * @param {Function} options.onBackspace - Custom Backspace handler (overrides default)
 * @param {string[]} options.disableExtensions - StarterKit extensions to disable
 */
export function useBlockEditor(block, options = {}) {
  const {
    placeholder = "Type '/' for commands",
    newBlockType = 'text',
    backspaceAction = 'delete',
    multiline = true,
    onEnter,
    onBackspace,
    disableExtensions = [],
  } = options;

  const updateBlock = useBlockStore(s => s.updateBlock);
  const addBlock = useBlockStore(s => s.addBlock);
  const deleteBlock = useBlockStore(s => s.deleteBlock);
  const changeBlockType = useBlockStore(s => s.changeBlockType);
  const focusBlockId = useBlockStore(s => s.focusBlockId);
  const pushUndo = useUndoStore(s => s.pushUndo);

  const lastPushedContent = useRef(block.content);
  const isInternalUpdate = useRef(false);

  // Build StarterKit config — disable extensions the caller doesn't want
  const starterKitConfig = {};
  disableExtensions.forEach(ext => { starterKitConfig[ext] = false; });

  const debouncedSave = useRef(
    debounce((blockId, html) => {
      updateBlock(blockId, { content: html });
    }, 800)
  ).current;

  const extensions = useMemo(() => [
    StarterKit.configure({
      ...starterKitConfig,
      // We handle our own block-level structure — disable TipTap's heading/list nodes
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link', rel: 'noopener noreferrer' },
    }),
    Underline,
    Placeholder.configure({ placeholder }),
    Highlight.configure({ multicolor: false }),
  ], [placeholder, JSON.stringify(starterKitConfig)]);

  const editor = useEditor({
    extensions,
    content: block.content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'true',
      },
      handleKeyDown: (view, event) => {
        // Enter — create new block (unless Shift is held for line break)
        if (event.key === 'Enter' && !event.shiftKey) {
          if (onEnter) {
            const handled = onEnter(editor);
            if (handled !== false) {
              event.preventDefault();
              return true;
            }
          } else {
            event.preventDefault();
            const html = sanitize(editor.getHTML());
            updateBlock(block.id, { content: html });
            addBlock(block.pageId, newBlockType, block.id);
            return true;
          }
        }

        // Backspace on empty block — delete or convert
        if (event.key === 'Backspace' && editor.isEmpty) {
          if (onBackspace) {
            const handled = onBackspace(editor);
            if (handled !== false) {
              event.preventDefault();
              return true;
            }
          } else if (backspaceAction === 'convert') {
            event.preventDefault();
            changeBlockType(block.id, 'text');
            return true;
          } else {
            event.preventDefault();
            deleteBlock(block.id);
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const cleaned = sanitize(html);

      // Undo tracking
      if (cleaned !== lastPushedContent.current) {
        if (lastPushedContent.current === block.content) {
          pushUndo({ blockId: block.id, oldContent: block.content, newContent: cleaned });
        }
        lastPushedContent.current = cleaned;
      }

      debouncedSave(block.id, cleaned);
    },
    onBlur: ({ editor: ed }) => {
      const html = sanitize(ed.getHTML());
      if (html !== block.content) {
        updateBlock(block.id, { content: html });
      }
    },
  });

  // Sync content from store → editor (when external changes arrive, e.g. decryption)
  useEffect(() => {
    if (editor && block.content !== undefined && !editor.isFocused) {
      const currentHTML = editor.getHTML();
      if (currentHTML !== block.content && block.content !== lastPushedContent.current) {
        isInternalUpdate.current = true;
        editor.commands.setContent(block.content || '', false);
        lastPushedContent.current = block.content;
        isInternalUpdate.current = false;
      }
    }
  }, [block.content, editor]);

  // Focus management
  useEffect(() => {
    if (editor && focusBlockId === block.id && !editor.isFocused) {
      requestAnimationFrame(() => {
        editor.commands.focus('end');
      });
    }
  }, [focusBlockId, block.id, editor]);

  return editor;
}
