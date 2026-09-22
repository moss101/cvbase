import { useEffect, useState } from 'react';

/**
 * `navigator.onLine` as React state. The shell still renders offline; screens
 * use this to show the offline StatePanel instead of a misleading error and
 * to disable cloud writes rather than let them fail later.
 */
export const useOnline = (): boolean => {
    const [online, setOnline] = useState<boolean>(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener('online', up);
        window.addEventListener('offline', down);
        return () => {
            window.removeEventListener('online', up);
            window.removeEventListener('offline', down);
        };
    }, []);
    return online;
};

export default useOnline;
