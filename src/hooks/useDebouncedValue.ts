/**
 * useDebouncedValue Hook
 *
 * Debounces a value, returning the updated value only after the specified delay
 * has passed without any new updates. Useful for expensive operations like parsing.
 */
import { useState, useEffect } from 'react'

/**
 * Debounce a value by a specified delay.
 *
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clear the timer if value changes before delay completes
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
