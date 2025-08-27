/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export default function useDebounce(value: any, delay: number) {
    // State to store the debounced value
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set up a timer that updates the debounced value after the specified delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup: If the value changes before the delay, clear the old timer
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Only re-run the effect if value or delay changes

    return debouncedValue;
}