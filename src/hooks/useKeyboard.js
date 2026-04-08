import { useEffect } from 'react';

export function useKeyboard(key, callback, modifiers = {}) {
    useEffect(() => {
        const handler = (e) => {
            const matchesModifiers = 
                (modifiers.ctrl ? e.ctrlKey || e.metaKey : true) &&
                (modifiers.shift ? e.shiftKey : true);

            if (e.key === key && matchesModifiers) {
                e.preventDefault();
                callback(e);
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [key, callback, modifiers]);
}
