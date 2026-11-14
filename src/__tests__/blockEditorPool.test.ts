import { describe, it, expect, beforeEach } from 'vitest';
import { useBlockStore } from '../stores/blockStore';
import { getNextEditableBlockId, isBlockVisibleInTree, EDITABLE_TYPES } from '../utils/editorBlockNavigation';
import { parseHtmlToRichText, renderRichTextToVDOM } from '../utils/richTextParser';
import React from 'react';

describe('Block Editor Performance & Pre-warmed Pool Architecture', () => {
  beforeEach(() => {
    useBlockStore.setState({
      blockMap: {},
      blockOrder: [],
      focusBlockId: null,
      prewarmedBlockId: null,
      focusPosition: 'end',
      navigationDirection: 'down',
    });
  });

  describe('1. Block Navigation & Tree Visibility', () => {
    it('identifies next editable block ignoring non-editable blocks', () => {
      const blockOrder = ['b1', 'b2', 'b3', 'b4', 'b5'];
      const blockMap: Record<string, any> = {
        b1: { id: 'b1', type: 'text', parentId: null },
        b2: { id: 'b2', type: 'divider', parentId: null }, // non-editable
        b3: { id: 'b3', type: 'image', parentId: null },   // non-editable
        b4: { id: 'b4', type: 'heading1', parentId: null },
        b5: { id: 'b5', type: 'todo', parentId: null },
      };

      const nextDown = getNextEditableBlockId('b1', 'down', blockOrder, blockMap);
      expect(nextDown).toBe('b4');

      const nextDownFrom4 = getNextEditableBlockId('b4', 'down', blockOrder, blockMap);
      expect(nextDownFrom4).toBe('b5');

      const nextUpFrom5 = getNextEditableBlockId('b5', 'up', blockOrder, blockMap);
      expect(nextUpFrom5).toBe('b4');

      const nextUpFrom4 = getNextEditableBlockId('b4', 'up', blockOrder, blockMap);
      expect(nextUpFrom4).toBe('b1');
    });

    it('skips blocks inside collapsed toggles', () => {
      const blockOrder = ['toggle1', 'child1', 'child2', 'bAfter'];
      const blockMap: Record<string, any> = {
        toggle1: { id: 'toggle1', type: 'toggle', parentId: null, properties: { expanded: false } },
        child1: { id: 'child1', type: 'text', parentId: 'toggle1' },
        child2: { id: 'child2', type: 'text', parentId: 'toggle1' },
        bAfter: { id: 'bAfter', type: 'text', parentId: null },
      };

      expect(isBlockVisibleInTree('child1', blockMap)).toBe(false);
      expect(isBlockVisibleInTree('bAfter', blockMap)).toBe(true);

      const nextFromToggle = getNextEditableBlockId('toggle1', 'down', blockOrder, blockMap);
      expect(nextFromToggle).toBe('bAfter');
    });
  });

  describe('2. 1-Block Pre-warmed Pool in BlockStore', () => {
    it('initializes with null focus and null pre-warmed block (0 Tiptap instances)', () => {
      const { focusBlockId, prewarmedBlockId } = useBlockStore.getState();
      expect(focusBlockId).toBeNull();
      expect(prewarmedBlockId).toBeNull();
    });

    it('pre-warms the next editable block when focusing downward', () => {
      const blockOrder = ['b1', 'b2', 'b3'];
      const blockMap: Record<string, any> = {
        b1: { id: 'b1', type: 'text', parentId: null },
        b2: { id: 'b2', type: 'heading2', parentId: null },
        b3: { id: 'b3', type: 'todo', parentId: null },
      };
      useBlockStore.setState({ blockOrder, blockMap });

      // Focus on b1 with default 'down' direction
      useBlockStore.getState().setFocusBlock('b1', 'start', 'down');

      const state1 = useBlockStore.getState();
      expect(state1.focusBlockId).toBe('b1');
      expect(state1.prewarmedBlockId).toBe('b2');

      // User navigates down to b2
      useBlockStore.getState().setFocusBlock('b2', 'start', 'down');

      const state2 = useBlockStore.getState();
      expect(state2.focusBlockId).toBe('b2');
      expect(state2.prewarmedBlockId).toBe('b3');
    });

    it('pre-warms the previous editable block when navigating upward', () => {
      const blockOrder = ['b1', 'b2', 'b3'];
      const blockMap: Record<string, any> = {
        b1: { id: 'b1', type: 'text', parentId: null },
        b2: { id: 'b2', type: 'heading2', parentId: null },
        b3: { id: 'b3', type: 'todo', parentId: null },
      };
      useBlockStore.setState({ blockOrder, blockMap });

      // User navigates up to b2
      useBlockStore.getState().setFocusBlock('b2', 'end', 'up');

      const state = useBlockStore.getState();
      expect(state.focusBlockId).toBe('b2');
      expect(state.prewarmedBlockId).toBe('b1');
      expect(state.navigationDirection).toBe('up');
    });

    it('falls back to opposite direction when at document boundary', () => {
      const blockOrder = ['b1', 'b2'];
      const blockMap: Record<string, any> = {
        b1: { id: 'b1', type: 'text', parentId: null },
        b2: { id: 'b2', type: 'text', parentId: null },
      };
      useBlockStore.setState({ blockOrder, blockMap });

      // Focus last block b2 navigating down -> no next down, should pre-warm b1
      useBlockStore.getState().setFocusBlock('b2', 'end', 'down');

      const state = useBlockStore.getState();
      expect(state.focusBlockId).toBe('b2');
      expect(state.prewarmedBlockId).toBe('b1');
    });

    it('clears pre-warmed block when focusing null (e.g. blurring to page title or sidebar)', () => {
      const blockOrder = ['b1', 'b2'];
      const blockMap: Record<string, any> = {
        b1: { id: 'b1', type: 'text', parentId: null },
        b2: { id: 'b2', type: 'text', parentId: null },
      };
      useBlockStore.setState({ blockOrder, blockMap });
      useBlockStore.getState().setFocusBlock('b1');

      expect(useBlockStore.getState().focusBlockId).toBe('b1');
      expect(useBlockStore.getState().prewarmedBlockId).toBe('b2');

      useBlockStore.getState().setFocusBlock(null);

      expect(useBlockStore.getState().focusBlockId).toBeNull();
      expect(useBlockStore.getState().prewarmedBlockId).toBeNull();
    });
  });

  describe('3. RichTextParser and VDOM Generation', () => {
    it('parses plain text directly with zero DOMParser overhead', () => {
      const spans = parseHtmlToRichText('Plain block text without tags');
      expect(spans).toHaveLength(1);
      expect(spans[0].text).toBe('Plain block text without tags');
      expect(spans[0].annotations.bold).toBe(false);
      expect(spans[0].href).toBeNull();
    });

    it('parses formatted HTML into structured spans', () => {
      const html = '<p>Hello <strong>bold world</strong> and <code>code</code> and <a href="https://example.com">link</a></p>';
      const spans = parseHtmlToRichText(html);

      expect(spans.length).toBeGreaterThanOrEqual(3);

      const boldSpan = spans.find(s => s.text === 'bold world');
      expect(boldSpan).toBeDefined();
      expect(boldSpan?.annotations.bold).toBe(true);

      const codeSpan = spans.find(s => s.text === 'code');
      expect(codeSpan).toBeDefined();
      expect(codeSpan?.annotations.code).toBe(true);

      const linkSpan = spans.find(s => s.text === 'link');
      expect(linkSpan).toBeDefined();
      expect(linkSpan?.href).toBe('https://example.com');
    });

    it('parses mentions and transclusions into specialized chip spans', () => {
      const mentionHtml = '<p>Ref to <a class="page-mention" href="/app/page/p123" data-page-id="p123"><span class="mention-icon">📝</span><span class="mention-label">Project Plan</span></a></p>';
      const spans = parseHtmlToRichText(mentionHtml);

      const mentionSpan = spans.find(s => s.mention);
      expect(mentionSpan).toBeDefined();
      expect(mentionSpan?.mention?.pageId).toBe('p123');
      expect(mentionSpan?.mention?.title).toBe('Project Plan');
      expect(mentionSpan?.mention?.icon).toBe('📝');

      const transclusionHtml = '<p><span class="transclusion-chip" data-transclusion="" data-block-id="b456" data-page-id="p999" data-text="Important quote" data-block-type="quote">⎘ Important quote</span></p>';
      const transSpans = parseHtmlToRichText(transclusionHtml);
      const transSpan = transSpans.find(s => s.transclusion);
      expect(transSpan).toBeDefined();
      expect(transSpan?.transclusion?.blockId).toBe('b456');
      expect(transSpan?.transclusion?.text).toBe('Important quote');
    });

    it('renders structured spans into pure React VDOM elements without ProseMirror', () => {
      const spans = [
        { text: 'Normal ', annotations: { bold: false, italic: false, underline: false, strikethrough: false, code: false, color: '', backgroundColor: '' }, href: null },
        { text: 'Bold', annotations: { bold: true, italic: false, underline: false, strikethrough: false, code: false, color: '', backgroundColor: '' }, href: null },
        { text: 'Page', annotations: { bold: false, italic: false, underline: false, strikethrough: false, code: false, color: '', backgroundColor: '' }, href: '/app/page/p1', mention: { pageId: 'p1', title: 'Page', icon: '📄' } },
      ];

      const vdom = renderRichTextToVDOM(spans);
      expect(React.isValidElement(vdom?.[0])).toBe(true);
      expect(Array.isArray(vdom)).toBe(true);
      expect(vdom).toHaveLength(3);
    });
  });
});
