/**
 * Constraints/Anchors Types
 *
 * Defines types for pin-to-edge constraint system.
 */

export type PinEdge = 'top' | 'right' | 'bottom' | 'left'
export type PinCenter = 'center-x' | 'center-y' | 'center'

export interface ConstraintValue {
  edge: PinEdge | PinCenter
  value: number | null  // null means not pinned, number is distance in px
  enabled: boolean
}

export interface ConstraintState {
  top: number | null
  right: number | null
  bottom: number | null
  left: number | null
  centerX: boolean
  centerY: boolean
}

export interface ConstraintPanelConfig {
  container: HTMLElement
  nodeId: string
  initialState: ConstraintState
  onChange: (constraint: PinEdge | PinCenter, value: number | null) => void
}

export interface ConstraintChangeEvent {
  nodeId: string
  constraint: PinEdge | PinCenter
  value: number | null
}
