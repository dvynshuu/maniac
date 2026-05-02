import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Mark, mergeAttributes } from '@tiptap/core';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useBlockStore } from '../stores/blockStore';
import { useUndoStore } from '../stores/undoStore';
import { useUIStore } from '../stores/uiStore';
import { debounce } from '../utils/helpers';
import { sanitize } from '../utils/sanitizer';
import { TiptapMention } from '../extensions/tiptapMention';
import { TiptapBacklink } from '../extensions/tiptapBacklink';
import { TiptapDatabaseChip } from '../extensions/tiptapDatabaseChip';
import { useEditorEngine } from './useEditorEngine';
import { useSelectionStore } from '../core/editor/selectionStore';

const CustomHighlight = Mark.create({
  name: 'customHighlight',
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class') || null,
        renderHTML: attributes => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: node => {
          const className = node.getAttribute('class');
          if (className && className.includes('hl-')) {
            return null;
          }
          return false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});


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

  const engine = useEditorEngine();
  const setSelection = useSelectionStore(s => s.setSelection);
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  const lastPushedContent = useRef(block.content);
  const isInternalUpdate = useRef(false);

  // Build StarterKit config — disable extensions the caller doesn't want
  const starterKitConfig = {};
  disableExtensions.forEach(ext => { starterKitConfig[ext] = false; });

  const debouncedSave = useRef(
    debounce((blockId, html) => {
      engine.startTransaction().updateBlock(blockId, { content: html }).commit();
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
    CustomHighlight,
    TiptapMention,
    TiptapBacklink,
    TiptapDatabaseChip,
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
        // Enter — split block
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          
          const { from } = editor.state.selection;
          const content = editor.getHTML();
          
          // Basic split logic (could be improved by looking at ProseMirror nodes)
          const text = editor.getText();
          const pos = from - 1; // Adjust for TipTap indexing
          
          // For now, let's just do a simple split if it's plain text or empty
          if (editor.isEmpty || pos >= text.length) {
            engine.insertAfter(block.id, newBlockType);
          } else {
            // Complex split would need ProseMirror state slicing
            // For now, let's just insert after if we can't easily slice HTML
            engine.insertAfter(block.id, newBlockType);
          }
          return true;
        }

        // Backspace on empty block — convert or delete
        if (event.key === 'Backspace' && editor.isEmpty) {
          event.preventDefault();
          if (backspaceAction === 'convert' && block.type !== 'text') {
            engine.convertType(block.id, 'text');
          } else {
            // Merge logic would go here: engine.merge(block.id, prevBlockId)
            // For now, keep simple delete
            engine.startTransaction().deleteBlock(block.id).commit();
          }
          return true;
        }

        // Tab — Nest
        if (event.key === 'Tab' && !event.shiftKey) {
          event.preventDefault();
          engine.nest(block.id);
          return true;
        }

        // Shift+Tab — Unnest
        if (event.key === 'Tab' && event.shiftKey) {
          event.preventDefault();
          engine.unnest(block.id);
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const cleaned = sanitize(html);
      lastPushedContent.current = cleaned;
      debouncedSave(block.id, cleaned);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      setSelection({
        anchorBlockId: block.id,
        focusBlockId: block.id,
        anchorOffset: from,
        focusOffset: to
      });
    },
    onFocus: ({ editor: ed }) => {
      const uiStore = useUIStore.getState();
      const blockStore = useBlockStore.getState();
      
      if (uiStore.activeEditorBlockId !== block.id) {
        uiStore.setActiveEditor(ed, block.id);
      }
      if (blockStore.focusBlockId !== block.id) {
        blockStore.setFocusBlock(block.id);
      }
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
