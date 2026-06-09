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
import { debounce, getPlainText, mergeHTML } from '../utils/helpers';
import { sanitize } from '../utils/sanitizer';
import { DOMSerializer } from '@tiptap/pm/model';
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


const EDITABLE_TYPES = [
  'text', 'heading1', 'heading2', 'heading3', 'todo', 
  'quote', 'callout', 'bullet', 'numbered', 'toggle', 'code'
];

function getNextEditableBlockId(currentId, direction) {
  const store = useBlockStore.getState();
  const { blockOrder, blockMap } = store;
  const index = blockOrder.indexOf(currentId);
  if (index === -1) return null;

  const step = direction === 'up' ? -1 : 1;
  let i = index + step;
  while (i >= 0 && i < blockOrder.length) {
    const nextId = blockOrder[i];
    const block = blockMap[nextId];
    if (block && EDITABLE_TYPES.includes(block.type)) {
      return nextId;
    }
    i += step;
  }
  return null;
}

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
      link: false,
      underline: false,
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
        // Space — auto-convert markdown prefixes at start of block
        if (event.key === ' ' && editor) {
          const { selection } = editor.state;
          const { from } = selection;
          if (from <= 6) {
            const text = editor.getText();
            const trimText = text.trim();
            let targetType = null;

            if (trimText === '#') {
              targetType = 'heading1';
            } else if (trimText === '##') {
              targetType = 'heading2';
            } else if (trimText === '###') {
              targetType = 'heading3';
            } else if (trimText === '*' || trimText === '-') {
              targetType = 'bullet';
            } else if (trimText === '1.') {
              targetType = 'numbered';
            } else if (trimText === '[]' || trimText === '[ ]') {
              targetType = 'todo';
            } else if (trimText === '>') {
              targetType = 'quote';
            } else if (trimText === '$$') {
              targetType = 'math';
            } else if (trimText === '```') {
              targetType = 'code';
            }

            if (targetType) {
              event.preventDefault();
              editor.commands.clearContent();
              engine.convertType(block.id, targetType);
              return true;
            }
          }
        }

        // ArrowUp — focus previous block
        if (event.key === 'ArrowUp') {
          if (view.endOfTextblock('up')) {
            const prevId = getNextEditableBlockId(block.id, 'up');
            if (prevId) {
              event.preventDefault();
              useBlockStore.getState().setFocusBlock(prevId, 'end');
              return true;
            }
          }
        }

        // ArrowDown — focus next block
        if (event.key === 'ArrowDown') {
          if (view.endOfTextblock('down')) {
            const nextId = getNextEditableBlockId(block.id, 'down');
            if (nextId) {
              event.preventDefault();
              useBlockStore.getState().setFocusBlock(nextId, 'start');
              return true;
            }
          }
        }

        // Enter — split block
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          
          const { selection, doc } = editor.state;
          const pos = selection.anchor;

          // Serialize htmlBefore and htmlAfter
          const serializer = DOMSerializer.fromSchema(editor.schema);
          const fragBefore = doc.cut(0, pos).content;
          const divBefore = document.createElement('div');
          divBefore.appendChild(serializer.serializeFragment(fragBefore));
          const htmlBefore = divBefore.innerHTML;

          const fragAfter = doc.cut(pos).content;
          const divAfter = document.createElement('div');
          divAfter.appendChild(serializer.serializeFragment(fragAfter));
          const htmlAfter = divAfter.innerHTML;

          // Perform split
          engine.split(block.id, htmlBefore, htmlAfter).then((results) => {
            if (results && results[1]) {
              const newBlock = results[1];
              // Set focus position to start of the new block
              useBlockStore.getState().setFocusBlock(newBlock.id, 'start');
            }
          });
          return true;
        }

        // Backspace — convert, delete, or merge
        if (event.key === 'Backspace') {
          const { selection } = editor.state;
          
          if (editor.isEmpty) {
            event.preventDefault();
            if (backspaceAction === 'convert' && block.type !== 'text') {
              engine.convertType(block.id, 'text');
            } else {
              engine.startTransaction().deleteBlock(block.id).commit();
            }
            return true;
          }

          if (selection.empty && selection.anchor === 1) {
            event.preventDefault();
            
            const prevId = getNextEditableBlockId(block.id, 'up');
            if (prevId) {
              const prevBlock = useBlockStore.getState().blockMap[prevId];
              if (prevBlock) {
                const prevText = getPlainText(prevBlock.content);
                const oldTextLength = prevText.length;
                
                // Merge contents based on type
                let mergedHtml;
                if (prevBlock.type === 'code') {
                  mergedHtml = prevBlock.content + '\n' + getPlainText(block.content);
                } else if (block.type === 'code') {
                  mergedHtml = mergeHTML(prevBlock.content, `<p>${block.content}</p>`);
                } else {
                  mergedHtml = mergeHTML(prevBlock.content, block.content);
                }

                // Batch the update and deletion
                engine.startTransaction()
                  .updateBlock(prevId, { content: mergedHtml })
                  .deleteBlock(block.id)
                  .commit();
                
                // Focus previous block at the junction
                useBlockStore.getState().setFocusBlock(prevId, oldTextLength + 1);
                return true;
              }
            }
          }
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
  }, [block.id, block.type]);

  // Seed the Yjs fragment on first load if it's empty but we have block.content
  useEffect(() => {
    if (editor && isFirstLoad.current && !block._isDecrypting) {
      if (editor.isEmpty && block.content) {
        editor.commands.setContent(block.content, false);
      }
      isFirstLoad.current = false;
    }
  }, [editor, block.content, block._isDecrypting]);

  // Focus management
  useEffect(() => {
    if (editor && focusBlockId === block.id && !editor.isFocused) {
      const position = useBlockStore.getState().focusPosition || 'end';
      requestAnimationFrame(() => {
        editor.commands.focus(position);
      });
    }
  }, [focusBlockId, block.id, editor]);

  return editor;
}
