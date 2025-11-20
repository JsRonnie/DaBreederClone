import { useEffect, useState } from "react";

/**
 * Delay updates to the provided value, useful for debouncing search inputs
 * before triggering expensive network calls.
 *
 * @param {any} value - The value to debounce.
 * @param {number} delay - Delay in milliseconds before propagating changes.
 * @returns {any} - The debounced value.
 */
export default function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
