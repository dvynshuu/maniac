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
import { getBlockFragment, waitForDoc } from '../core/crdtManager';

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
  'text', 'heading1', 'heading2', 'heading3',
  'toggle_heading1', 'toggle_heading2', 'toggle_heading3',
  'todo', 'quote', 'callout', 'bullet', 'numbered', 'toggle', 'code'
];

function isBlockVisibleInTree(blockId: string, blockMap: Record<string, any>): boolean {
  let curr = blockMap[blockId];
  while (curr && curr.parentId) {
    const parent = blockMap[curr.parentId];
    if (!parent) break;
    const isCollapsible = parent.type === 'toggle' || parent.type === 'toggle_heading1' || parent.type === 'toggle_heading2' || parent.type === 'toggle_heading3';
    if (isCollapsible && parent.properties?.expanded === false) {
      return false;
    }
    curr = parent;
  }
  return true;
}

function getNextEditableBlockId(currentId: string, direction: 'up' | 'down') {
  const store = useBlockStore.getState();
  const { blockOrder, blockMap } = store;
  const index = blockOrder.indexOf(currentId);
  if (index === -1) return null;

  const step = direction === 'up' ? -1 : 1;
  let i = index + step;
  while (i >= 0 && i < blockOrder.length) {
    const nextId = blockOrder[i];
    const block = blockMap[nextId];
    if (block && EDITABLE_TYPES.includes(block.type) && isBlockVisibleInTree(nextId, blockMap)) {
      return nextId;
    }
    i += step;
  }
  return null;
}

export interface UseBlockEditorOptions {
  placeholder?: string;
  newBlockType?: string;
  backspaceAction?: 'delete' | 'merge' | 'convert' | 'none';
  multiline?: boolean;
  onEnter?: (e?: any) => boolean | void;
  onBackspace?: (e?: any) => boolean | void;
  disableExtensions?: string[];
  [key: string]: any;
}

/**
 * useBlockEditor — the shared TipTap integration for all editable block types.
 * Handles: editor instance creation, focus management, debounced persistence,
 * undo tracking, and keyboard shortcuts (Enter to create new block, Backspace to delete).
 */
export function useBlockEditor(block: any, options: UseBlockEditorOptions = {}) {
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
  const isFocusedTarget = useBlockStore(s => s.focusBlockId === block.id);

  const isFirstLoad = useRef(true);
  const lastSavedContentRef = useRef(block.content);

  // Build StarterKit config — disable extensions the caller doesn't want
  const starterKitConfig = useMemo(() => {
    const config: Record<string, boolean> = {};
    disableExtensions.forEach(ext => { config[ext] = false; });
    return config;
  }, [disableExtensions]);

  const saveContent = useCallback((blockId: string, rawHtml: string) => {
    const cleanHtml = sanitize(rawHtml);
    lastSavedContentRef.current = cleanHtml;
    engine.startTransaction().updateBlock(blockId, { content: cleanHtml }).commit();
  }, [engine]);

  const debouncedSaveRef = useRef<any>(null);
  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = debounce(saveContent, 350);
  }

  const extensions = useMemo(() => [
    (StarterKit as any).configure({
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
  ], [placeholder, starterKitConfig, block.id, block.pageId]);

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
            } else if (trimText === '>>#' || trimText === '>#') {
              targetType = 'toggle_heading1';
            } else if (trimText === '>>##' || trimText === '>##') {
              targetType = 'toggle_heading2';
            } else if (trimText === '>>###' || trimText === '>###') {
              targetType = 'toggle_heading3';
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
            } else if (trimText === '---' || trimText === '***') {
              targetType = 'divider';
            }

            if (targetType) {
              event.preventDefault();
              editor.commands.clearContent();
              if (targetType === 'divider') {
                engine.startTransaction()
                  .convertType(block.id, 'divider')
                  .createBlock('text', block.parentId, block.id)
                  .commit()
                  .then((results) => {
                    const newBlock = results?.[1];
                    if (newBlock) {
                      useBlockStore.getState().setFocusBlock(newBlock.id, 'start');
                    }
                  });
              } else {
                engine.startTransaction()
                  .updateBlock(block.id, { content: '' })
                  .convertType(block.id, targetType)
                  .commit()
                  .then(() => {
                    useBlockStore.getState().setFocusBlock(block.id, 'start');
                  });
              }
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
          if (onEnter) {
            const handled = onEnter(editor);
            if (handled) return true;
          }

          event.preventDefault();

          // If in an empty non-text block (bullet, numbered, todo, quote, callout),
          // hitting Enter smoothly breaks out to regular text!
          if (editor.isEmpty && block.type !== 'text') {
            engine.convertType(block.id, 'text');
            useBlockStore.getState().setFocusBlock(block.id, 'start');
            return true;
          }
          
          const { selection, doc } = editor.state;
          const pos = selection.anchor;
          const isAtEnd = pos >= doc.content.size - 1;

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

          // Determine target new block type:
          // If at end of heading/quote/callout, create normal text block.
          // If list item, keep list item type.
          const targetNewType = isAtEnd
            ? newBlockType
            : (['bullet', 'numbered', 'todo'].includes(block.type) ? block.type : newBlockType);

          // Optimistically truncate current editor immediately for zero-lag feeling
          editor.chain().deleteRange({ from: pos, to: doc.content.size }).run();

          // Perform split
          engine.split(block.id, htmlBefore, htmlAfter, targetNewType).then((results) => {
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
          if (onBackspace) {
            const handled = onBackspace(editor);
            if (handled) return true;
          }

          const { selection } = editor.state;
          
          if (editor.isEmpty) {
            event.preventDefault();
            if (backspaceAction === 'convert' && block.type !== 'text') {
              engine.convertType(block.id, 'text');
              useBlockStore.getState().setFocusBlock(block.id, 'start');
            } else {
              const prevId = getNextEditableBlockId(block.id, 'up');
              if (prevId) {
                useBlockStore.getState().setFocusBlock(prevId, 'end');
              }
              engine.startTransaction().deleteBlock(block.id).commit();
            }
            return true;
          }

          if (selection.empty && selection.anchor === 1) {
            event.preventDefault();

            // If non-text block at pos 1, convert to text first
            if (block.type !== 'text' && backspaceAction === 'convert') {
              engine.convertType(block.id, 'text');
              useBlockStore.getState().setFocusBlock(block.id, 'start');
              return true;
            }
            
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
          engine.nest(block.id).then(() => {
            useBlockStore.getState().setFocusBlock(block.id);
          });
          return true;
        }

        // Shift+Tab — Unnest
        if (event.key === 'Tab' && event.shiftKey) {
          event.preventDefault();
          engine.unnest(block.id).then(() => {
            useBlockStore.getState().setFocusBlock(block.id);
          });
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Yjs handles the real-time sync with 0ms overhead.
      // We pass raw HTML to debounced saver, which sanitizes & saves when idle.
      const rawHtml = ed.getHTML();
      debouncedSaveRef.current(block.id, rawHtml);
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
      if (html !== lastSavedContentRef.current && html !== block.content) {
        saveContent(block.id, html);
      }
    },
  }, [block.id, block.type, saveContent]);

  // Seed the Yjs fragment on first load if it's empty but we have block.content
  useEffect(() => {
    let isMounted = true;
    const seedContent = async () => {
      if (editor && isFirstLoad.current && !block._isDecrypting) {
        if (block.pageId) {
          await waitForDoc(block.pageId);
        }
        if (!isMounted) return;

        // Check if Yjs fragment already has content loaded from CRDT history
        const fragment = getBlockFragment(block.pageId, block.id);
        const hasYjsContent = fragment && fragment.length > 0;

        isFirstLoad.current = false;
        if (editor.isEmpty && !hasYjsContent && block.content) {
          editor.commands.setContent(block.content, { emitUpdate: false });
        }
      }
    };
    seedContent();
    return () => { isMounted = false; };
  }, [editor, block.content, block._isDecrypting, block.pageId, block.id]);

  // Focus management: immediate focus if DOM connected, rAF fallback
  useEffect(() => {
    if (editor && isFocusedTarget && !editor.isFocused) {
      const position = useBlockStore.getState().focusPosition || 'end';
      const focusEditor = () => {
        if (!editor.isDestroyed) {
          editor.commands.focus(position);
        }
      };

      if (editor.view?.dom && document.body.contains(editor.view.dom)) {
        focusEditor();
      } else {
        requestAnimationFrame(focusEditor);
      }
    }
  }, [isFocusedTarget, block.id, editor]);

  return editor;
}
