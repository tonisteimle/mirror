/**
 * Renderer Types
 *
 * Shared types for renderer components.
 */

import type { ReactNode } from 'react'
import type { ASTNode } from '../../parser/types'
import type { TypographyContextValue } from '../contexts/typography-context'

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
  /** Callback when node is clicked */
  onClick?: (id: string) => void
  /** Callback for page navigation */
  onPageNavigate?: (targetPage: string) => void
  /** Parent has stacked layout - children should use grid-area: 1/1 */
  parentStacked?: boolean
  /** Parent state overrides for children (e.g., state collapsed { Content { hidden } }) */
  parentStateOverrides?: Map<string, Record<string, unknown>>
  /** Inherited typography from App (font, size, color, line-height) */
  typography?: TypographyContextValue
}

/**
 * Function type for rendering child nodes.
 * Used to avoid circular dependencies in extracted renderers.
 */
export type RenderChildrenFn = (nodes: ASTNode[], options: GenerateOptions) => ReactNode
