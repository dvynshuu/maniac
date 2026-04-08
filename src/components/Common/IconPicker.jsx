import { EMOJIS } from '../../utils/constants';
import { useEffect, useRef } from 'react';

export default function IconPicker({ onSelect, onClose }) {
    const pickerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                onClose();
            }
        };
        
        // Small delay so the click that opened it doesn't immediately close it
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 10);
        
        return () => document.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    return (
        <div className="icon-picker" ref={pickerRef}>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                Choose an icon
            </div>
            <div className="icon-picker-grid">
                {EMOJIS.map(emoji => (
                    <button 
                        key={emoji} 
                        className="icon-picker-item"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(emoji);
                        }}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}
