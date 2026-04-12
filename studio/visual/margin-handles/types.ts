/**
 * Margin Handles Types
 *
 * Type definitions for the margin manipulation system.
 */

export type MarginEdge = 'top' | 'right' | 'bottom' | 'left'

export interface MarginValues {
  top: number
  right: number
  bottom: number
  left: number
}

export interface MarginHandleState {
  nodeId: string
  edge: MarginEdge
  startX: number
  startY: number
  startValue: number
  currentValue: number
}

export interface MarginHandlesConfig {
  /** Container element for the overlay */
  container: HTMLElement
  /** Callback when margin value changes */
  onMarginChange: (nodeId: string, edge: MarginEdge, value: number) => void
  /** Callback when margin drag ends */
  onMarginDragEnd?: (nodeId: string, margins: Partial<MarginValues>) => void
  /** Node ID attribute (default: 'data-mirror-id') */
  nodeIdAttribute?: string
  /** Minimum margin value (default: 0) */
  minValue?: number
  /** Maximum margin value (default: 200) */
  maxValue?: number
  /** Show margin values on hover (default: true) */
  showValues?: boolean
}

export interface ElementLayout {
  x: number
  y: number
  width: number
  height: number
  margin: MarginValues
}
