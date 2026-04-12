/**
 * Measurement Renderer
 * Feature 6: Measurement Overlays
 *
 * Renders measurement lines and distance labels in the overlay.
 */

import type { Measurement } from './types'

const MEASUREMENT_COLOR = '#FF6B6B'
const MEASUREMENT_LINE_WIDTH = 1
const MEASUREMENT_LABEL_BG = 'rgba(255, 107, 107, 0.9)'

export interface MeasurementRendererConfig {
  container: HTMLElement
}

export class MeasurementRenderer {
  private container: HTMLElement
  private overlay: HTMLElement | null = null
  private elements: HTMLElement[] = []

  constructor(config: MeasurementRendererConfig) {
    this.container = config.container
  }

  /**
   * Show measurements in the overlay
   */
  show(measurements: Measurement[]): void {
    this.hide()
    this.ensureOverlay()

    for (const measurement of measurements) {
      this.renderMeasurement(measurement)
    }
  }

  /**
   * Hide all measurements
   */
  hide(): void {
    for (const el of this.elements) {
      el.remove()
    }
    this.elements = []
  }

  /**
   * Dispose the renderer
   */
  dispose(): void {
    this.hide()
    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
  }

  private ensureOverlay(): void {
    if (this.overlay && this.container.contains(this.overlay)) {
      return
    }

    this.overlay = document.createElement('div')
    this.overlay.className = 'measurement-overlay'
    Object.assign(this.overlay.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '10002',
    })

    // Ensure container has positioning
    if (!this.container.style.position || this.container.style.position === 'static') {
      this.container.style.position = 'relative'
    }

    this.container.appendChild(this.overlay)
  }

  private renderMeasurement(measurement: Measurement): void {
    if (!this.overlay) return

    // Render line
    const line = this.createLine(measurement)
    this.overlay.appendChild(line)
    this.elements.push(line)

    // Render end caps
    const startCap = this.createEndCap(measurement.lineStart, measurement.direction)
    const endCap = this.createEndCap(measurement.lineEnd, measurement.direction)
    this.overlay.appendChild(startCap)
    this.overlay.appendChild(endCap)
    this.elements.push(startCap, endCap)

    // Render label
    const label = this.createLabel(measurement)
    this.overlay.appendChild(label)
    this.elements.push(label)
  }

  private createLine(measurement: Measurement): HTMLElement {
    const line = document.createElement('div')
    line.className = 'measurement-line'

    const { lineStart, lineEnd, direction } = measurement

    if (direction === 'horizontal') {
      const width = Math.abs(lineEnd.x - lineStart.x)
      Object.assign(line.style, {
        position: 'absolute',
        left: `${Math.min(lineStart.x, lineEnd.x)}px`,
        top: `${lineStart.y}px`,
        width: `${width}px`,
        height: `${MEASUREMENT_LINE_WIDTH}px`,
        backgroundColor: MEASUREMENT_COLOR,
        pointerEvents: 'none',
      })
    } else {
      const height = Math.abs(lineEnd.y - lineStart.y)
      Object.assign(line.style, {
        position: 'absolute',
        left: `${lineStart.x}px`,
        top: `${Math.min(lineStart.y, lineEnd.y)}px`,
        width: `${MEASUREMENT_LINE_WIDTH}px`,
        height: `${height}px`,
        backgroundColor: MEASUREMENT_COLOR,
        pointerEvents: 'none',
      })
    }

    return line
  }

  private createEndCap(point: { x: number; y: number }, direction: 'horizontal' | 'vertical'): HTMLElement {
    const cap = document.createElement('div')
    cap.className = 'measurement-cap'

    const capSize = 6

    if (direction === 'horizontal') {
      // Vertical end cap for horizontal measurement
      Object.assign(cap.style, {
        position: 'absolute',
        left: `${point.x - MEASUREMENT_LINE_WIDTH / 2}px`,
        top: `${point.y - capSize / 2}px`,
        width: `${MEASUREMENT_LINE_WIDTH}px`,
        height: `${capSize}px`,
        backgroundColor: MEASUREMENT_COLOR,
        pointerEvents: 'none',
      })
    } else {
      // Horizontal end cap for vertical measurement
      Object.assign(cap.style, {
        position: 'absolute',
        left: `${point.x - capSize / 2}px`,
        top: `${point.y - MEASUREMENT_LINE_WIDTH / 2}px`,
        width: `${capSize}px`,
        height: `${MEASUREMENT_LINE_WIDTH}px`,
        backgroundColor: MEASUREMENT_COLOR,
        pointerEvents: 'none',
      })
    }

    return cap
  }

  private createLabel(measurement: Measurement): HTMLElement {
    const label = document.createElement('div')
    label.className = 'measurement-label'
    label.textContent = `${measurement.distance}px`

    Object.assign(label.style, {
      position: 'absolute',
      left: `${measurement.labelPosition.x}px`,
      top: `${measurement.labelPosition.y}px`,
      transform: 'translate(-50%, -50%)',
      padding: '2px 6px',
      backgroundColor: MEASUREMENT_LABEL_BG,
      color: 'white',
      fontSize: '10px',
      fontFamily: 'monospace',
      fontWeight: '600',
      borderRadius: '3px',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: '10003',
    })

    return label
  }
}

/**
 * Create a MeasurementRenderer instance
 */
export function createMeasurementRenderer(config: MeasurementRendererConfig): MeasurementRenderer {
  return new MeasurementRenderer(config)
}
