import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Collaboration from '@tiptap/extension-collaboration';
import { Mark, mergeAttributes } from '@tiptap/core';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useBlockStore } from '../stores/blockStore';
import { useUIStore } from '../stores/uiStore';
import { debounce } from '../utils/helpers';
import { sanitize } from '../utils/sanitizer';
import { TiptapMention } from '../extensions/tiptapMention';
import { TiptapBacklink } from '../extensions/tiptapBacklink';
import { TiptapDatabaseChip } from '../extensions/tiptapDatabaseChip';
import { useEditorEngine } from './useEditorEngine';
import { useSelectionStore } from '../core/editor/selectionStore';
import { getBlockFragment } from '../core/crdtManager';

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

  const isFirstLoad = useRef(true);

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
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      history: false, // Collaboration extension brings its own history or we rely on CommandBus for structural undo
    }),
    Collaboration.configure({
      fragment: getBlockFragment(block.pageId, block.id),
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
  ], [placeholder, JSON.stringify(starterKitConfig), block.id, block.pageId]);

  const editor = useEditor({
    extensions,
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
          const text = editor.getText();
          const pos = from - 1; // Adjust for TipTap indexing
          
          if (editor.isEmpty || pos >= text.length) {
            engine.insertAfter(block.id, newBlockType);
          } else {
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
      // Yjs handles the real-time sync, but we still debounce save to CommandBus 
      // so it goes into db.blocks for full-text search and previews.
      const html = ed.getHTML();
      debouncedSave(block.id, sanitize(html));
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
        engine.updateBlock(block.id, { content: html });
      }
    },
  });

  // Seed the Yjs fragment on first load if it's empty but we have block.content
  useEffect(() => {
    if (editor && isFirstLoad.current) {
      if (editor.isEmpty && block.content) {
        editor.commands.setContent(block.content, false);
      }
      isFirstLoad.current = false;
    }
  }, [editor, block.content]);

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
