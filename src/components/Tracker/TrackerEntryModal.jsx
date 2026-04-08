import { useState, useEffect } from 'react';
import { useTrackerStore } from '../../stores/trackerStore';
import Modal from '../Common/Modal';
import FieldRenderer from './FieldRenderer';

export default function TrackerEntryModal({ tracker, entry, onClose }) {
  const addEntry = useTrackerStore(s => s.addEntry);
  const updateEntry = useTrackerStore(s => s.updateEntry);
  const deleteEntry = useTrackerStore(s => s.deleteEntry);

  const [data, setData] = useState({});

  useEffect(() => {
    if (entry) {
      setData({ ...entry.data });
    } else {
      // Setup defaults
      const defaults = {};
      tracker.fields.forEach(f => {
         if (f.defaultValue !== undefined && f.defaultValue !== null) {
            defaults[f.id] = f.defaultValue;
         }
      });
      setData(defaults);
    }
  }, [entry, tracker]);

  const handleSave = async () => {
    if (entry) {
      await updateEntry(entry.id, data);
    } else {
      await addEntry(tracker.id, data);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (window.confirm("Are you sure you want to delete this entry?")) {
        await deleteEntry(entry.id);
        onClose();
    }
  };

  return (
    <Modal 
       title={entry ? 'Edit Entry' : 'New Entry'} 
       onClose={onClose} 
       onConfirm={handleSave}
    >
        {tracker.fields.length === 0 ? (
           <div className="text-tertiary">No fields defined. Edit tracker properties to add fields.</div>
        ) : (
           <div className="flex-col gap-4">
              {tracker.fields.map(field => (
                 <div key={field.id} className="input-group">
                    <label className="input-label">{field.name || 'Unnamed Field'}</label>
                    <FieldRenderer 
                       field={field} 
                       value={data[field.id]} 
                       onChange={(val) => setData({ ...data, [field.id]: val })} 
                    />
                 </div>
              ))}
           </div>
        )}

        {entry && (
           <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                 Delete Entry
              </button>
           </div>
        )}
    </Modal>
  );
}
