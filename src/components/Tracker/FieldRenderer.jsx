import { TRACKER_FIELD_TYPES } from '../../utils/constants';

export default function FieldRenderer({ field, value, onChange, readonly }) {
    
    // Fallback display if readonly
    if (readonly) {
        if (value === undefined || value === null || value === '') return <span className="text-tertiary">-</span>;
        
        switch (field.type) {
            case TRACKER_FIELD_TYPES.BOOLEAN:
                return value ? 'Yes' : 'No';
            case TRACKER_FIELD_TYPES.SELECT:
                return <span className="tag" style={{ background: 'var(--bg-active)' }}>{value}</span>;
            case TRACKER_FIELD_TYPES.DATE:
                return new Date(value).toLocaleDateString();
            default:
                return <span>{value}</span>;
        }
    }

    // Editable form controls
    switch (field.type) {
        case TRACKER_FIELD_TYPES.TEXT:
            return (
                <input 
                    type="text" 
                    className="input" 
                    value={value || ''} 
                    onChange={e => onChange(e.target.value)} 
                    placeholder="Enter text..."
                />
            );
            
        case TRACKER_FIELD_TYPES.NUMBER:
            return (
                <input 
                    type="number" 
                    className="input" 
                    value={value || ''} 
                    onChange={e => onChange(e.target.value)} 
                    placeholder="Enter number..."
                />
            );
            
        case TRACKER_FIELD_TYPES.BOOLEAN:
            return (
                <button 
                    className={`toggle-switch ${value ? 'active' : ''}`}
                    onClick={() => onChange(!value)}
                />
            );
            
        case TRACKER_FIELD_TYPES.SELECT:
            // Very simplified: uses plain text input for tags in V1, could be dropdown
            return (
                <input 
                    type="text" 
                    className="input" 
                    value={value || ''} 
                    onChange={e => onChange(e.target.value)} 
                    placeholder="Enter tag..."
                />
            );
            
        case TRACKER_FIELD_TYPES.DATE:
            return (
                <input 
                    type="date" 
                    className="input" 
                    value={value || ''} 
                    onChange={e => onChange(e.target.value)} 
                />
            );
            
        default:
            return <span className="text-tertiary">Unsupported field type</span>;
    }
}
