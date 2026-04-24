import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import { db } from '../../db/database';
import { Search, FileText, Plus, Star, Type, Hash, Lock } from 'lucide-react';
import { useSecurityStore } from '../../stores/securityStore';

export default function CommandPalette({ onClose }) {
    const pages = usePageStore(s => s.pages);
    const addPage = usePageStore(s => s.addPage);
    const setCurrentPage = usePageStore(s => s.setCurrentPage);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [blockResults, setBlockResults] = useState([]);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const isEncrypted = useSecurityStore(s => !!s.derivedKey);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const lowerQuery = query.toLowerCase();
    
    // Page results
    const pageResults = useMemo(() => 
        pages
            .filter(p => !p.isArchived && (p.title || 'Untitled').toLowerCase().includes(lowerQuery))
            .map(p => ({ ...p, resultType: 'page' }))
            .slice(0, 6),
        [pages, lowerQuery]
    );

    // Full-text block content search (async, debounced)
    // Uses plain text search for unencrypted, and blind indexing (HMAC) for encrypted
    useEffect(() => {
        if (query.length < 2) {
            setBlockResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const queryWords = lowerQuery.split(/[\s\W]+/).filter(w => w.length > 1);
                let matches = [];
                
                if (queryWords.length > 0) {
                    const { hmacKey } = useSecurityStore.getState();
                    const { SecurityService } = await import('../../utils/securityService');
                    
                    let searchWords = queryWords;
                    if (isEncrypted && hmacKey) {
                        searchWords = await Promise.all(queryWords.map(w => SecurityService.hmacWord(w, hmacKey)));
                    }

                    // For encrypted words we need exact matches of the HMAC string.
                    // For plaintext we can use startsWithAnyOfIgnoreCase.
                    let rawMatches = [];
                    if (isEncrypted) {
                        rawMatches = await db.blocks.where('words').anyOf(searchWords).limit(10).toArray();
                    } else {
                        rawMatches = await db.blocks.where('words').startsWithAnyOfIgnoreCase(searchWords).limit(10).toArray();
                    }
                        
                    const uniqueMatches = [];
                    const seen = new Set();
                    for (const m of rawMatches) {
                        if (!seen.has(m.id)) {
                            seen.add(m.id);
                            uniqueMatches.push(m);
                        }
                    }
                    matches = uniqueMatches.slice(0, 5);
                }

                // Enrich with page info and decrypt snippet if needed
                const { derivedKey } = useSecurityStore.getState();
                const { SecurityService } = await import('../../utils/securityService');

                const enriched = await Promise.all(matches.map(async (b) => {
                    const page = await db.pages.get(b.pageId);
                    
                    let plainText = b.content || '';
                    if (isEncrypted && b._isEncrypted && derivedKey) {
                        try {
                            plainText = await SecurityService.decrypt(b.content, derivedKey);
                        } catch {
                            plainText = '🔒 Encrypted Content';
                        }
                    }
                    
                    plainText = plainText.replace(/<[^>]*>/g, '');
                    const idx = plainText.toLowerCase().indexOf(lowerQuery);
                    const start = Math.max(0, idx - 30);
                    // if idx is -1 (due to stemming or exact hmac match vs substring), we just show start
                    const end = Math.min(plainText.length, (idx > -1 ? idx : 30) + lowerQuery.length + 30);
                    const snippet = (start > 0 ? '...' : '') + plainText.slice(start, end) + (end < plainText.length ? '...' : '');
                    
                    return {
                        id: b.id,
                        pageId: b.pageId,
                        pageTitle: page?.title || 'Untitled',
                        pageIcon: page?.icon || '📄',
                        blockType: b.type,
                        snippet,
                        resultType: 'block',
                    };
                }));
                setBlockResults(enriched);
            } catch (e) {
                console.error("Search failed:", e);
                setBlockResults([]);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [query, lowerQuery, isEncrypted]);
        
    const cmds = [
        { id: 'cmd-new-page', title: 'Create new page', icon: Plus, run: async () => {
            const p = await addPage();
            setCurrentPage(p.id);
            navigate(`/page/${p.id}`);
            onClose();
        }},
        { id: 'cmd-toggle-sidebar', title: 'Toggle Sidebar', icon: Search, run: () => {
            useUIStore.getState().toggleSidebar();
            onClose();
        }}
    ].filter(c => c.title.toLowerCase().includes(lowerQuery));

    const results = [...pageResults, ...blockResults, ...cmds];

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (results.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                const item = results[selectedIndex];
                if (item.resultType === 'page') {
                    setCurrentPage(item.id);
                    navigate(`/page/${item.id}`);
                    onClose();
                } else if (item.resultType === 'block') {
                    setCurrentPage(item.pageId);
                    navigate(`/page/${item.pageId}`);
                    onClose();
                } else if (item.run) {
                    item.run();
                }
            }
        }
    };

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette" onClick={e => e.stopPropagation()}>
                <div className="command-palette-input-wrapper">
                    <Search className="text-tertiary" size={20} />
                    <input
                        ref={inputRef}
                        className="command-palette-input"
                        placeholder="Search pages, content, or type a command..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                
                <div className="command-palette-results">
                    {results.length === 0 ? (
                        <div className="command-palette-empty">No results found</div>
                    ) : (
                        results.map((item, idx) => {
                            const isSelected = idx === selectedIndex;
                            if (item.resultType === 'page') {
                                return (
                                    <div 
                                        key={item.id} 
                                        className={`command-palette-item ${isSelected ? 'active' : ''}`}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        onClick={() => {
                                            setCurrentPage(item.id);
                                            navigate(`/page/${item.id}`);
                                            onClose();
                                        }}
                                    >
                                        <div className="command-palette-item-icon">
                                            {item.icon === '📝' ? <FileText size={16} /> : <span>{item.icon}</span>}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <span className="command-palette-item-label">{item.title || 'Untitled'}</span>
                                        </div>
                                        <span className="command-palette-item-kbd">Page</span>
                                    </div>
                                )
                            } else if (item.resultType === 'block') {
                                return (
                                    <div 
                                        key={item.id} 
                                        className={`command-palette-item ${isSelected ? 'active' : ''}`}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        onClick={() => {
                                            setCurrentPage(item.pageId);
                                            navigate(`/page/${item.pageId}`);
                                            onClose();
                                        }}
                                    >
                                        <div className="command-palette-item-icon">
                                            <Type size={14} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                          <span className="command-palette-item-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {item.pageIcon} {item.pageTitle}
                                          </span>
                                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.snippet}
                                          </span>
                                        </div>
                                        <span className="command-palette-item-kbd">Block</span>
                                    </div>
                                )
                            } else {
                                const Icon = item.icon;
                                return (
                                    <div 
                                        key={item.id} 
                                        className={`command-palette-item ${isSelected ? 'active' : ''}`}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        onClick={item.run}
                                    >
                                        <div className="command-palette-item-icon">
                                            <Icon size={16} />
                                        </div>
                                        <span className="command-palette-item-label">{item.title}</span>
                                        <span className="command-palette-item-kbd">Action</span>
                                    </div>
                                )
                            }
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
