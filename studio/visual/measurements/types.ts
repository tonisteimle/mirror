/**
 * Measurement Types
 * Feature 6: Measurement Overlays
 */

export type MeasurementEdge = 'top' | 'right' | 'bottom' | 'left'

export interface Measurement {
  /** Source element ID */
  from: string
  /** Target element ID or 'container' */
  to: string
  /** Edge being measured */
  edge: MeasurementEdge
  /** Distance in pixels */
  distance: number
  /** Position for the label (container-relative) */
  labelPosition: { x: number; y: number }
  /** Start point of the measurement line */
  lineStart: { x: number; y: number }
  /** End point of the measurement line */
  lineEnd: { x: number; y: number }
  /** Direction of measurement */
  direction: 'horizontal' | 'vertical'
}

// Re-export the canonical Rect so existing
// `import { Rect } from '.../measurements/types'` keeps working.
export type { Rect } from '../models/coordinate'

export interface MeasurementConfig {
  /** Minimum distance to show measurement (in px) */
  minDistance?: number
  /** Maximum number of measurements to show */
  maxMeasurements?: number
}
