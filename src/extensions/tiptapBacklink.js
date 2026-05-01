/**
 * ─── TipTap Backlink Extension ─────────────────────────────────
 * Inline [[backlink]] chips. Triggered by typing '[['.
 * Semantically identical to mentions but represents explicit
 * bidirectional page links for the backlinks graph index.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const TiptapBacklink = Node.create({
  name: 'backlink',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: '' },
      icon: { default: '📄' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-backlink]',
        getAttrs: (el) => ({
          pageId: el.getAttribute('data-page-id'),
          title: el.getAttribute('data-title') || el.textContent,
          icon: el.getAttribute('data-icon') || '📄',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-backlink': '',
        'data-page-id': node.attrs.pageId,
        'data-title': node.attrs.title,
        'data-icon': node.attrs.icon,
        class: 'backlink-chip',
        contenteditable: 'false',
      }),
      `🔗 ${node.attrs.title || 'Untitled'}`,
    ];
  },

  addCommands() {
    return {
      insertBacklink: (attrs) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs,
          })
          .insertContent(' ')
          .run();
      },
    };
  },
});
