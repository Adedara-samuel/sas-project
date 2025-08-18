// src/providers/hydration-provider.tsx
'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';

export default function HydrationProvider({ children }: { children: React.ReactNode }) {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // Check if the store has already hydrated from local storage
        const hasHydrated = useStore.persist.hasHydrated();
        if (hasHydrated) {
            setIsHydrated(true);
        } else {
            // If not, subscribe to the hydration event
            const unsubscribe = useStore.persist.onHydrate(() => setIsHydrated(true));
            return () => unsubscribe();
        }
    }, []);

    return isHydrated ? children : null;
}