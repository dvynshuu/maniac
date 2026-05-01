/**
 * ─── TipTap Database Chip Extension ────────────────────────────
 * Inline database reference chips.
 * Renders as a styled chip that links to a database block.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const TiptapDatabaseChip = Node.create({
  name: 'databaseChip',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      blockId: { default: null },
      title: { default: 'Database' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-db-chip]',
        getAttrs: (el) => ({
          blockId: el.getAttribute('data-block-id'),
          title: el.getAttribute('data-title') || 'Database',
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-db-chip': '',
        'data-block-id': node.attrs.blockId,
        'data-title': node.attrs.title,
        class: 'db-chip',
        contenteditable: 'false',
      }),
      `📊 ${node.attrs.title}`,
    ];
  },

  addCommands() {
    return {
      insertDatabaseChip: (attrs) => ({ chain }) => {
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
