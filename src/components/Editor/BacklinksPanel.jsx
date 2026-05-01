import { useState, useMemo } from 'react';
import { useBacklinkStore } from '../../stores/backlinkStore';
import { usePageStore } from '../../stores/pageStore';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Link2 } from 'lucide-react';

export default function BacklinksPanel({ pageId }) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const pages = usePageStore(s => s.pages);
  const backlinkDetails = useBacklinkStore(s => s.backlinkDetails);
  const backlinks = useMemo(() => backlinkDetails[pageId] || [], [backlinkDetails, pageId]);

  if (backlinks.length === 0) return null;

  // Deduplicate by source page
  const byPage = new Map();
  for (const bl of backlinks) {
    if (!byPage.has(bl.sourcePageId)) {
      byPage.set(bl.sourcePageId, []);
    }
    byPage.get(bl.sourcePageId).push(bl);
  }

  return (
    <div className="backlinks-panel">
      <div className="backlinks-header" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Link2 size={14} />
        <span>{byPage.size} page{byPage.size !== 1 ? 's' : ''} link{byPage.size === 1 ? 's' : ''} to this page</span>
      </div>

      {expanded && (
        <div className="backlinks-list">
          {[...byPage.entries()].map(([sourcePageId, entries]) => {
            const page = pages.find(p => p.id === sourcePageId);
            if (!page) return null;

            return (
              <div
                key={sourcePageId}
                className="backlink-entry"
                onClick={() => navigate(`/page/${sourcePageId}`)}
              >
                <div className="backlink-entry-title">
                  <span>{page.icon || '📝'}</span>
                  <span>{page.title || 'Untitled'}</span>
                </div>
                {entries[0]?.snippet && (
                  <div className="backlink-entry-snippet">
                    {entries[0].snippet}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
