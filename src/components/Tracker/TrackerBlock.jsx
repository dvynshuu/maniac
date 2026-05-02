import { useState, useEffect } from 'react';
import { useTrackerStore } from '../../stores/trackerStore';
import { useEditorEngine } from '../../hooks/useEditorEngine';
import { Database, LayoutGrid, List, Plus, Settings } from 'lucide-react';
import TrackerTable from './TrackerTable';
import TrackerCards from './TrackerCards';
import TrackerEntryModal from './TrackerEntryModal';
import TrackerFieldEditor from './TrackerFieldEditor';

export default function TrackerBlock({ block }) {
    const trackers = useTrackerStore(s => s.trackers);
    const addTracker = useTrackerStore(s => s.addTracker);
    const updateTracker = useTrackerStore(s => s.updateTracker);
    
    const engine = useEditorEngine();
    
    const trackerId = block.properties?.trackerId;
    const tracker = trackers.find(t => t.id === trackerId);

    const [viewType, setViewType] = useState('table');
    const [isEditingFields, setIsEditingFields] = useState(false);
    const [entryModalOpen, setEntryModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);

    const [localEntries, setLocalEntries] = useState([]);
    
    useEffect(() => {
        if (!trackerId) return;
        import('../../db/database').then(({ db }) => {
            db.tracker_entries.where('trackerId').equals(trackerId).reverse().sortBy('createdAt')
              .then(setLocalEntries);
        });
    }, [trackerId, entryModalOpen]);

    if (!trackerId || !tracker) {
        return (
            <div className="tracker-container" contentEditable={false}>
                <div style={{ padding: '24px', textAlign: 'center' }}>
                    <Database size={32} className="text-tertiary" style={{ margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>Empty Tracker</h3>
                    <button 
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                            const t = await addTracker();
                            engine.updateBlock(block.id, {
                                properties: { ...block.properties, trackerId: t.id }
                            });
                        }}
                    >
                        Initialize Database
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="tracker-container" contentEditable={false}>
            <div className="tracker-header">
                <div className="tracker-title">
                    <span>{tracker.icon}</span>
                    <input 
                        value={tracker.name} 
                        onChange={e => updateTracker(trackerId, { name: e.target.value })}
                        style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', outline: 'none' }}
                        placeholder="Untitled Database"
                    />
                </div>
                <div className="tracker-actions">
                    <div className="tracker-view-toggle">
                        <button 
                            className={`tracker-view-btn ${viewType === 'table' ? 'active' : ''}`}
                            onClick={() => setViewType('table')}
                        ><List size={14}/></button>
                        <button 
                            className={`tracker-view-btn ${viewType === 'card' ? 'active' : ''}`}
                            onClick={() => setViewType('card')}
                        ><LayoutGrid size={14}/></button>
                    </div>
                    <button className="btn btn-icon" onClick={() => setIsEditingFields(true)}>
                        <Settings size={14} />
                    </button>
                    <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}
                    >
                        <Plus size={12} /> New
                    </button>
                </div>
            </div>

            {viewType === 'table' ? (
                <TrackerTable 
                    tracker={tracker} 
                    entries={localEntries}
                    onRowClick={(entry) => { setEditingEntry(entry); setEntryModalOpen(true); }}
                />
            ) : (
                <TrackerCards 
                    tracker={tracker} 
                    entries={localEntries}
                    onCardClick={(entry) => { setEditingEntry(entry); setEntryModalOpen(true); }} 
                />
            )}

            {isEditingFields && (
                <TrackerFieldEditor 
                    tracker={tracker} 
                    onClose={() => setIsEditingFields(false)} 
                />
            )}

            {entryModalOpen && (
                <TrackerEntryModal 
                    tracker={tracker} 
                    entry={editingEntry}
                    onClose={() => setEntryModalOpen(false)}
                />
            )}
        </div>
    );
}
