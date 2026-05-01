/**
 * ─── Core: Rich Text Adapter ────────────────────────────────────
 * Abstract interface for rich text editing.
 * Currently backed by TipTap (ProseMirror).
 */

export class RichTextAdapter {
  constructor(editorInstance) {
    this.editor = editorInstance;
  }

  /**
   * Get content as HTML or JSON.
   */
  getContent(format = 'html') {
    if (format === 'html') return this.editor.getHTML();
    return this.editor.getJSON();
  }

  /**
   * Set editor content.
   */
  setContent(content) {
    this.editor.commands.setContent(content);
  }

  /**
   * Insert a mention at the current position.
   */
  insertMention(id, label, type = 'page') {
    this.editor.chain()
      .focus()
      .insertContent({
        type: 'mention',
        attrs: { id, label, type }
      })
      .run();
  }

  /**
   * Check if editor is empty.
   */
  isEmpty() {
    return this.editor.isEmpty;
  }
}
