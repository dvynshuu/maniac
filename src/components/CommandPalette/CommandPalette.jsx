import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import { Search, FileText, Database, Plus } from 'lucide-react';

export default function CommandPalette({ onClose }) {
    const pages = usePageStore(s => s.pages);
    const addPage = usePageStore(s => s.addPage);
    const setCurrentPage = usePageStore(s => s.setCurrentPage);
    const setSidebarOpen = useUIStore(s => s.setSidebarOpen);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    // Simple fuzzy filter
    const lowerQuery = query.toLowerCase();
    
    const pageResults = pages
        .filter(p => !p.isArchived && (p.title || 'Untitled').toLowerCase().includes(lowerQuery))
        .map(p => ({ ...p, resultType: 'page' }))
        .slice(0, 5);
        
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

    const results = [...pageResults, ...cmds];

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
                        placeholder="Search or type a command..."
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
                                        <span className="command-palette-item-label">{item.title || 'Untitled'}</span>
                                        <span className="command-palette-item-kbd">Page</span>
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
