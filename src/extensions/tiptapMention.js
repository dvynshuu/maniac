/**
 * ─── TipTap Mention Extension ──────────────────────────────────
 * Inline @mention chips that link to pages.
 * Triggered by typing '@' in the editor.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const TiptapMention = Node.create({
  name: 'mention',
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
        tag: 'span[data-mention]',
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
        'data-mention': '',
        'data-page-id': node.attrs.pageId,
        'data-title': node.attrs.title,
        'data-icon': node.attrs.icon,
        class: 'mention-chip',
        contenteditable: 'false',
      }),
      `${node.attrs.icon || '📄'} ${node.attrs.title || 'Untitled'}`,
    ];
  },

  addCommands() {
    return {
      insertMention: (attrs) => ({ chain }) => {
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
