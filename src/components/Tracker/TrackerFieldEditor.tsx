import { useState } from 'react';
import { useTrackerStore } from '../../stores/trackerStore';
import { TRACKER_FIELD_TYPES, TRACKER_FIELD_TYPE_META } from '../../utils/constants';
import Modal from '../Common/Modal';
import { Trash2, Plus } from 'lucide-react';

export default function TrackerFieldEditor({ tracker, onClose }) {
    const addField = useTrackerStore(s => s.addField);
    const updateField = useTrackerStore(s => s.updateField);
    const deleteField = useTrackerStore(s => s.deleteField);

    const handleCreateField = () => {
        addField(tracker.id, { name: 'New Field', type: TRACKER_FIELD_TYPES.TEXT });
    };

    return (
        <Modal 
            title="Database Properties" 
            onClose={onClose}
            confirmText="Done"
            onConfirm={onClose}
        >
            <div className="flex-col gap-3">
                {tracker.fields.map((field) => (
                    <div key={field.id} className="flex items-center gap-2" style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                        <select 
                            className="input" 
                            style={{ width: '120px' }}
                            value={field.type}
                            onChange={(e) => updateField(tracker.id, field.id, { type: e.target.value })}
                        >
                            {Object.entries(TRACKER_FIELD_TYPES).map(([k, v]) => (
                                <option key={v} value={v}>{TRACKER_FIELD_TYPE_META[v].label}</option>
                            ))}
                        </select>
                        <input 
                            className="input" 
                            style={{ flex: 1 }}
                            value={field.name}
                            onChange={(e) => updateField(tracker.id, field.id, { name: e.target.value })}
                            placeholder="Field name"
                        />
                        <button className="btn btn-icon" onClick={() => deleteField(tracker.id, field.id)}>
                            <Trash2 size={14} className="text-tertiary hover:text-error" />
                        </button>
                    </div>
                ))}

                <button 
                    className="btn btn-secondary w-full" 
                    style={{ marginTop: '8px' }}
                    onClick={handleCreateField}
                >
                    <Plus size={14} /> Add Property
                </button>
            </div>
        </Modal>
    );
}
