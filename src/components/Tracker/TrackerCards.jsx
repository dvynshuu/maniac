import FieldRenderer from './FieldRenderer';

export default function TrackerCards({ tracker, entries, onCardClick }) {
    if (entries.length === 0) {
        return (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No entries yet
            </div>
        );
    }
    
    return (
        <div className="tracker-cards">
            {entries.map(entry => (
                <div key={entry.id} className="tracker-card" onClick={() => onCardClick(entry)}>
                    {tracker.fields.slice(0, 4).map((field, idx) => (
                        <div key={field.id} className="tracker-card-field">
                            <div className="tracker-card-field-label">{field.name}</div>
                            <div className={`tracker-card-field-value ${idx === 0 ? 'font-semibold' : ''}`}>
                                <FieldRenderer field={field} value={entry.data[field.id]} readonly />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
