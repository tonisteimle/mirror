/**
 * Position Controls Types
 *
 * Types for numeric input and position section components.
 */

export interface NumericInputConfig {
  container: HTMLElement
  label: string
  value: number
  unit?: string           // 'px' default
  step?: number           // 1 default, 10 with Shift
  min?: number            // Minimum value
  max?: number            // Maximum value
  onChange: (value: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

export interface PositionSectionConfig {
  container: HTMLElement
  x: number
  y: number
  nodeId: string
  onChange: (axis: 'x' | 'y', value: number) => void
}

export interface PositionValue {
  x: number
  y: number
}
