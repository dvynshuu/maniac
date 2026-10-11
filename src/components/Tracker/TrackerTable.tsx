import FieldRenderer from './FieldRenderer';

export default function TrackerTable({ tracker, entries, onRowClick }) {
    return (
        <div className="tracker-table-wrapper">
            <table className="tracker-table">
                <thead>
                    <tr>
                        {tracker.fields.map(field => (
                            <th key={field.id}>{field.name || 'Unnamed Field'}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {entries.length === 0 ? (
                        <tr>
                            <td colSpan={tracker.fields.length || 1} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                                No entries yet
                            </td>
                        </tr>
                    ) : (
                        entries.map(entry => (
                            <tr key={entry.id} onClick={() => onRowClick(entry)} style={{ cursor: 'pointer' }}>
                                {tracker.fields.map(field => (
                                    <td key={field.id}>
                                        <FieldRenderer 
                                            field={field} 
                                            value={entry.data[field.id]} 
                                            readonly 
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
