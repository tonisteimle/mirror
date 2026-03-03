/**
 * Hover Context
 *
 * Provides hover state and hover styles to child primitives.
 * Used by InteractiveComponent to pass hover state to Input/Textarea primitives
 * so they can apply hover styles directly to the native element.
 */

import { createContext, useContext } from 'react'

export interface HoverContextValue {
  isHovered: boolean
  hoverStyles: React.CSSProperties
}

export const HoverContext = createContext<HoverContextValue | null>(null)

export function useHoverContext(): HoverContextValue | null {
  return useContext(HoverContext)
}
