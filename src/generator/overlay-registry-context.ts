/**
 * Overlay Registry Context Definition
 *
 * Context for overlay state management.
 * Separated from provider to avoid react-refresh issues.
 */

import { createContext } from 'react'
import type { ASTNode } from '../parser/types'

export type OverlayPosition = 'below' | 'above' | 'left' | 'right' | 'center'

export interface OverlayState {
  node: ASTNode
  animation?: string
  duration?: number
  position?: OverlayPosition
  triggerRect?: DOMRect  // Position of the trigger element
  isClosing?: boolean
}

export interface OverlayOpenOptions {
  animation?: string
  duration?: number
  position?: OverlayPosition
  triggerRect?: DOMRect
}

export interface OverlayRegistry {
  overlays: Map<string, OverlayState>
  open: (name: string, node: ASTNode, options?: OverlayOpenOptions) => void
  close: (name?: string, animation?: string, duration?: number) => void
  isOpen: (name: string) => boolean
}

export const OverlayRegistryContext = createContext<OverlayRegistry | null>(null)
