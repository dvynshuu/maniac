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
import { TiptapTransclusion } from '../extensions/tiptapTransclusion';
import { useIntelligenceStore, scheduleIdleFlashcardSync } from '../stores/intelligenceStore';
import { useEditorEngine } from './useEditorEngine';
import { useSelectionStore } from '../core/editor/selectionStore';
import { getBlockFragment, waitForDoc } from '../core/crdtManager';
import { undo, redo } from '../core/commandBus';

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


import { EDITABLE_TYPES, isBlockVisibleInTree, getNextEditableBlockId } from '../utils/editorBlockNavigation';

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

  const engine = useEditorEngine(block.pageId);
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
    engine.updateBlock(blockId, { content: cleanHtml });

    // Auto-sync cloze deletions & Q/A syntax into intelligenceStore (debounced during idle time)
    try {
      const allBlocks = Object.values(useBlockStore.getState().blockMap);
      scheduleIdleFlashcardSync(block.pageId, allBlocks, 350);
    } catch (e) {
      /* ignore sync error */
    }
  }, [engine, block.pageId]);

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
    TiptapTransclusion,
  ], [placeholder, starterKitConfig, block.id, block.pageId]);

  const editor = useEditor({
    extensions,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'true',
      },
      handleKeyDown: (view, event) => {
        // Undo (Mod+Z) and Redo (Mod+Y or Mod+Shift+Z) delegated to unified CommandBus
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
          return true;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
          event.preventDefault();
          redo();
          return true;
        }

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
              useBlockStore.getState().setFocusBlock(prevId, 'end', 'up');
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
              useBlockStore.getState().setFocusBlock(nextId, 'start', 'down');
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
              useBlockStore.getState().setFocusBlock(newBlock.id, 'start', 'down');
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
                useBlockStore.getState().setFocusBlock(prevId, 'end', 'up');
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
                useBlockStore.getState().setFocusBlock(prevId, oldTextLength + 1, 'up');
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

  // External store synchronization for structural undo, redo, and remote mutations
  useEffect(() => {
    if (editor && !isFirstLoad.current && !block._isDecrypting) {
      if (block.content !== lastSavedContentRef.current && !editor.isFocused) {
        lastSavedContentRef.current = block.content || '';
        editor.commands.setContent(block.content || '', { emitUpdate: false });
      }
    }
  }, [editor, block.content, block._isDecrypting]);

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

  // Flush uncommitted changes immediately on unmount and clean activeEditor ref
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        const rawHtml = editor.getHTML();
        const cleanHtml = sanitize(rawHtml);
        if (cleanHtml !== lastSavedContentRef.current) {
          lastSavedContentRef.current = cleanHtml;
          engine.startTransaction().updateBlock(block.id, { content: cleanHtml }).commit();
        }
      }
      const uiStore = useUIStore.getState();
      if (uiStore.activeEditorBlockId === block.id) {
        uiStore.clearActiveEditor();
      }
    };
  }, [editor, block.id, engine]);

  return editor;
}
