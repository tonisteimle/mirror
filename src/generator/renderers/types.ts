/**
 * Renderer Types
 *
 * Shared types for renderer components.
 */

import type { ReactNode } from 'react'
import type { ASTNode } from '../../parser/types'

/**
 * Options passed to renderers for controlling render behavior
 */
export interface GenerateOptions {
  /** Enable inspect mode with hover/selection highlights */
  inspectMode?: boolean
  /** Currently hovered node ID */
  hoveredId?: string | null
  /** Currently selected node ID */
  selectedId?: string | null
  /** Callback when node is hovered */
  onHover?: (id: string | null) => void
  /** Callback when node is selected */
  onSelect?: (id: string) => void
  /** Callback for page navigation */
  onPageNavigate?: (targetPage: string) => void
}

/**
 * Function type for rendering child nodes.
 * Used to avoid circular dependencies in extracted renderers.
 */
export type RenderChildrenFn = (nodes: ASTNode[], options: GenerateOptions) => ReactNode
