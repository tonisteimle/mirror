/**
 * useDebounce Hook
 *
 * Debounces a value with a configurable delay.
 * Useful for search inputs to avoid filtering on every keystroke.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Debounce a value with a delay.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 150ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('')
 * const debouncedQuery = useDebounce(query, 200)
 *
 * // debouncedQuery updates 200ms after query stops changing
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 150): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Skip debounce for empty values (instant clear)
    if (value === '' || value === null || value === undefined) {
      setDebouncedValue(value)
      return
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounce a callback function.
 *
 * Uses useRef for timer to avoid re-renders on every debounce call.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns A debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 150
): T {
  // Use ref to avoid re-renders when timer changes
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep callback in ref to always have latest version
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      callbackRef.current(...args)
      timerRef.current = null
    }, delay)
  }, [delay]) as T

  return debouncedCallback
}
