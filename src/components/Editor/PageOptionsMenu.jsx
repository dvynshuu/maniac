import { useState, useMemo } from 'react';
import { 
  Type, 
  Maximize2, 
  Minimize2, 
  Lock, 
  Unlock, 
  Star, 
  Download, 
  Trash2, 
  FileText,
  Check,
  AlignLeft,
  Copy
} from 'lucide-react';
import { usePageStore } from '../../stores/pageStore';
import { useBlockStore } from '../../stores/blockStore';
import { useUIStore } from '../../stores/uiStore';

export default function PageOptionsMenu({ page, updatePage, onClose, position }) {
  const deletePage = usePageStore((s) => s.deletePage);
  const toggleFavorite = usePageStore((s) => s.toggleFavorite);
  const blockMap = useBlockStore((s) => s.blockMap);
  const blockOrder = useBlockStore((s) => s.blockOrder);
  const addToast = useUIStore((s) => s.addToast);

  // Compute Word Count & Character Count for active page
  const stats = useMemo(() => {
    let text = (page?.title || '') + ' ';
    for (const id of blockOrder) {
      const block = blockMap[id];
      if (block && block.pageId === page?.id && block.content) {
        // Strip HTML tags for clean text
        const clean = block.content.replace(/<[^>]*>/g, ' ');
        text += clean + ' ';
      }
    }
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.trim().length;
    return { words, chars };
  }, [page, blockMap, blockOrder]);

  const fontStyle = page?.fontStyle || 'sans';
  const isFullWidth = !!page?.fullWidth;
  const isSmallText = !!page?.smallText;
  const isLocked = !!page?.isLocked;
  const isFav = !!page?.isFavorite;

  const handleExportMarkdown = () => {
    let md = `# ${page?.title || 'Untitled'}\n\n`;
    if (page?.description) {
      md += `> ${page.description}\n\n`;
    }
    for (const id of blockOrder) {
      const block = blockMap[id];
      if (block && block.pageId === page?.id) {
        const text = block.content?.replace(/<[^>]*>/g, '') || '';
        switch (block.type) {
          case 'heading1':
            md += `# ${text}\n\n`;
            break;
          case 'heading2':
            md += `## ${text}\n\n`;
            break;
          case 'heading3':
            md += `### ${text}\n\n`;
            break;
          case 'bullet':
            md += `- ${text}\n`;
            break;
          case 'numbered':
            md += `1. ${text}\n`;
            break;
          case 'todo':
            md += `- [${block.properties?.checked ? 'x' : ' '}] ${text}\n`;
            break;
          case 'quote':
            md += `> ${text}\n\n`;
            break;
          case 'code':
            md += `\`\`\`${block.properties?.language || ''}\n${text}\n\`\`\`\n\n`;
            break;
          case 'divider':
            md += `---\n\n`;
            break;
          default:
            if (text) md += `${text}\n\n`;
            break;
        }
      }
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(page?.title || 'Untitled').replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Exported markdown file', 'success');
    onClose();
  };

  return (
    <>
      <div className="page-options-overlay" onClick={onClose} />
      <div 
        className="page-options-popover" 
        style={{ top: position.top, right: position.right }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Font Style Switcher */}
        <div className="page-options-section">
          <div className="page-options-section-label">STYLE</div>
          <div className="page-font-style-grid">
            <button
              className={`page-font-style-btn font-sans ${fontStyle === 'sans' ? 'active' : ''}`}
              onClick={() => updatePage(page.id, { fontStyle: 'sans' })}
            >
              <span className="font-preview-title">Default</span>
              <span className="font-preview-sub">Clean sans-serif</span>
              {fontStyle === 'sans' && <Check size={13} className="font-check-icon" />}
            </button>
            <button
              className={`page-font-style-btn font-serif ${fontStyle === 'serif' ? 'active' : ''}`}
              onClick={() => updatePage(page.id, { fontStyle: 'serif' })}
            >
              <span className="font-preview-title">Serif</span>
              <span className="font-preview-sub">Editorial & calm</span>
              {fontStyle === 'serif' && <Check size={13} className="font-check-icon" />}
            </button>
            <button
              className={`page-font-style-btn font-mono ${fontStyle === 'mono' ? 'active' : ''}`}
              onClick={() => updatePage(page.id, { fontStyle: 'mono' })}
            >
              <span className="font-preview-title">Mono</span>
              <span className="font-preview-sub">Code & technical</span>
              {fontStyle === 'mono' && <Check size={13} className="font-check-icon" />}
            </button>
          </div>
        </div>

        <div className="page-options-divider" />

        {/* Toggles: Small Text & Full Width */}
        <div className="page-options-section">
          <div 
            className="page-options-row" 
            onClick={() => updatePage(page.id, { smallText: !isSmallText })}
          >
            <span className="page-options-row-label">Small text</span>
            <div className={`page-options-toggle-switch ${isSmallText ? 'is-on' : ''}`}>
              <div className="page-options-toggle-thumb" />
            </div>
          </div>

          <div 
            className="page-options-row" 
            onClick={() => updatePage(page.id, { fullWidth: !isFullWidth })}
          >
            <span className="page-options-row-label">Full width</span>
            <div className={`page-options-toggle-switch ${isFullWidth ? 'is-on' : ''}`}>
              <div className="page-options-toggle-thumb" />
            </div>
          </div>

          <div 
            className="page-options-row" 
            onClick={() => updatePage(page.id, { isLocked: !isLocked })}
          >
            <span className="page-options-row-label">Lock page</span>
            <div className={`page-options-toggle-switch ${isLocked ? 'is-on' : ''}`}>
              <div className="page-options-toggle-thumb" />
            </div>
          </div>
        </div>

        <div className="page-options-divider" />

        {/* Actions & Export */}
        <div className="page-options-section">
          <button 
            className="page-options-btn"
            onClick={() => {
              toggleFavorite(page.id);
              onClose();
            }}
          >
            <Star size={15} style={isFav ? { color: 'var(--warning)', fill: 'var(--warning)' } : {}} />
            <span>{isFav ? 'Remove from Favorites' : 'Add to Favorites'}</span>
          </button>

          <button 
            className="page-options-btn"
            onClick={handleExportMarkdown}
          >
            <Download size={15} />
            <span>Export as Markdown</span>
          </button>

          <button 
            className="page-options-btn page-options-btn-danger"
            onClick={() => {
              deletePage(page.id);
              onClose();
            }}
          >
            <Trash2 size={15} />
            <span>Delete page</span>
          </button>
        </div>

        <div className="page-options-divider" />

        {/* Document Stats */}
        <div className="page-options-footer-stats">
          <span>Word count: <strong>{stats.words}</strong></span>
          <span>•</span>
          <span>Characters: <strong>{stats.chars}</strong></span>
        </div>
      </div>
    </>
  );
}
