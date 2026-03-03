/**
 * Filled Context
 *
 * Provides setIsFilled callback to child primitives (Input/Textarea).
 * Primitives call setIsFilled(true/false) when their value changes,
 * allowing InteractiveComponent to apply 'state filled' styles.
 *
 * Maps to CSS :not(:placeholder-shown) pseudo-class.
 */

import { createContext, useContext } from 'react'

export interface FilledContextValue {
  setIsFilled: (filled: boolean) => void
}

export const FilledContext = createContext<FilledContextValue | null>(null)

export function useFilledContext(): FilledContextValue | null {
  return useContext(FilledContext)
}
