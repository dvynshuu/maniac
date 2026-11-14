/**
 * ─── TipTap Block Transclusion Extension ─────────────────────────
 * Inline (((blockId))) transclusion chips.
 * Triggered by typing '((' to search and embed a live reference
 * to any individual paragraph, heading, or block across the workspace.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const TiptapTransclusion = Node.create({
  name: 'transclusion',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      blockId: { default: null },
      pageId: { default: null },
      text: { default: '' },
      blockType: { default: 'text' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-transclusion]',
        getAttrs: (el: any) => ({
          blockId: el.getAttribute('data-block-id'),
          pageId: el.getAttribute('data-page-id'),
          text: el.getAttribute('data-text') || el.textContent?.replace(/^⎘\s*/, ''),
          blockType: el.getAttribute('data-block-type') || 'text',
        }),
      },
      {
        tag: 'a[data-transclusion]',
        getAttrs: (el: any) => ({
          blockId: el.getAttribute('data-block-id'),
          pageId: el.getAttribute('data-page-id'),
          text: el.getAttribute('data-text') || el.textContent?.replace(/^⎘\s*/, ''),
          blockType: el.getAttribute('data-block-type') || 'text',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const rawText = node.attrs.text || 'Transcluded block';
    const displaySnippet = rawText.length > 60 ? `${rawText.substring(0, 57)}...` : rawText;

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-transclusion': '',
        'data-block-id': node.attrs.blockId,
        'data-page-id': node.attrs.pageId,
        'data-text': node.attrs.text,
        'data-block-type': node.attrs.blockType,
        class: 'transclusion-chip',
        contenteditable: 'false',
        title: `Transclusion: ${node.attrs.text} (Click to open)`,
      }),
      `⎘ ${displaySnippet}`,
    ];
  },

  addCommands() {
    return {
      insertTransclusion: (attrs: any) => ({ chain }: any) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs,
          })
          .insertContent(' ')
          .run();
      },
    } as any;
  },
});
