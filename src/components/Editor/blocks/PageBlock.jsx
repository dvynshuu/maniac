import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../../stores/pageStore';
import { useUIStore } from '../../../stores/uiStore';
import EmojiIcon from '../../Common/EmojiIcon';
import { ArrowUpRight } from 'lucide-react';

export default function PageBlock({ block }) {
  const navigate = useNavigate();
  const pages = usePageStore((s) => s.pages);
  const setCurrentPage = usePageStore((s) => s.setCurrentPage);
  const pageId = block.properties?.pageId;

  // Retrieve the linked page from the pageStore reactively
  const linkedPage = pages.find((p) => p.id === pageId);

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!pageId) return;

    // Automatically expand parent page in the sidebar tree if needed
    if (block.pageId) {
      useUIStore.getState().setPageExpanded(block.pageId, true);
    }

    setCurrentPage(pageId);
    navigate(`/page/${pageId}`);
  };

  if (!linkedPage) {
    return (
      <div className="block-page-link block-page-link-deleted" contentEditable={false}>
        <span className="block-page-icon">🗑️</span>
        <span className="block-page-title">Deleted Page</span>
      </div>
    );
  }

  return (
    <div 
      className="block-page-link" 
      onClick={handleClick}
      contentEditable={false}
    >
      <span className="block-page-icon">
        <EmojiIcon emoji={linkedPage.icon || '📝'} size="18px" />
      </span>
      <span className="block-page-title">
        {linkedPage.title || 'Untitled'}
      </span>
      <ArrowUpRight size={14} className="block-page-arrow" />
    </div>
  );
}
