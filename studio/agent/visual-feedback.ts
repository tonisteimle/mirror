/**
 * Visual Feedback for Mirror Agent
 *
 * Shows visual feedback during agent tool execution.
 */

// ============================================
// TYPES
// ============================================

export interface HighlightOptions {
  color?: string
  style?: 'outline' | 'overlay' | 'pulse'
  duration?: number
  label?: string
}

export interface FeedbackEvent {
  type: 'highlight' | 'measure' | 'change' | 'error'
  selector?: string
  element?: HTMLElement
  data?: any
}

// ============================================
// VISUAL FEEDBACK MANAGER
// ============================================

export class VisualFeedbackManager {
  private previewContainer: HTMLElement | null = null
  private overlayContainer: HTMLElement | null = null
  private activeHighlights: Map<string, HTMLElement> = new Map()
  private measureOverlays: HTMLElement[] = []

  constructor() {
    this.createOverlayContainer()
  }

  // ============================================
  // SETUP
  // ============================================

  setPreviewContainer(container: HTMLElement): void {
    this.previewContainer = container
    this.positionOverlayContainer()
  }

  private createOverlayContainer(): void {
    this.overlayContainer = document.createElement('div')
    this.overlayContainer.className = 'agent-visual-feedback'
    this.overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `
    document.body.appendChild(this.overlayContainer)
  }

  private positionOverlayContainer(): void {
    if (!this.previewContainer || !this.overlayContainer) return

    const rect = this.previewContainer.getBoundingClientRect()
    this.overlayContainer.style.top = `${rect.top + window.scrollY}px`
    this.overlayContainer.style.left = `${rect.left + window.scrollX}px`
    this.overlayContainer.style.width = `${rect.width}px`
    this.overlayContainer.style.height = `${rect.height}px`
  }

  // ============================================
  // HIGHLIGHT
  // ============================================

  highlight(selector: string, options: HighlightOptions = {}): void {
    const {
      color = '#5BA8F5',
      style = 'outline',
      duration = 2000,
      label
    } = options

    const element = this.findElement(selector)
    if (!element) return

    // Remove existing highlight
    this.clearHighlight(selector)

    // Create highlight
    const highlight = this.createHighlightElement(element, color, style, label)
    this.activeHighlights.set(selector, highlight)

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => this.clearHighlight(selector), duration)
    }
  }

  highlightMultiple(selectors: string[], options: HighlightOptions = {}): void {
    selectors.forEach((sel, i) => {
      this.highlight(sel, {
        ...options,
        label: options.label ? `${options.label} ${i + 1}` : undefined
      })
    })
  }

  clearHighlight(selector: string): void {
    const highlight = this.activeHighlights.get(selector)
    if (highlight) {
      highlight.remove()
      this.activeHighlights.delete(selector)
    }
  }

  clearAllHighlights(): void {
    this.activeHighlights.forEach(el => el.remove())
    this.activeHighlights.clear()
  }

  private createHighlightElement(
    target: HTMLElement,
    color: string,
    style: 'outline' | 'overlay' | 'pulse',
    label?: string
  ): HTMLElement {
    const rect = target.getBoundingClientRect()
    const previewRect = this.previewContainer?.getBoundingClientRect() || { left: 0, top: 0 }

    const highlight = document.createElement('div')
    highlight.className = `agent-highlight agent-highlight-${style}`

    const x = rect.left - previewRect.left
    const y = rect.top - previewRect.top

    highlight.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
    `

    switch (style) {
      case 'outline':
        highlight.style.border = `2px solid ${color}`
        highlight.style.borderRadius = '4px'
        highlight.style.boxShadow = `0 0 0 2px ${color}33`
        break

      case 'overlay':
        highlight.style.backgroundColor = `${color}22`
        highlight.style.border = `1px solid ${color}88`
        highlight.style.borderRadius = '4px'
        break

      case 'pulse':
        highlight.style.border = `2px solid ${color}`
        highlight.style.borderRadius = '4px'
        highlight.style.animation = 'agent-pulse 1s ease-in-out infinite'
        break
    }

    // Add label if provided
    if (label) {
      const labelEl = document.createElement('span')
      labelEl.className = 'agent-highlight-label'
      labelEl.textContent = label
      labelEl.style.cssText = `
        position: absolute;
        top: -20px;
        left: 0;
        background: ${color};
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        white-space: nowrap;
      `
      highlight.appendChild(labelEl)
    }

    this.overlayContainer?.appendChild(highlight)
    return highlight
  }

  // ============================================
  // MEASUREMENTS
  // ============================================

  showMeasurement(
    fromSelector: string,
    toSelector: string,
    type: 'gap' | 'width' | 'height' = 'gap'
  ): void {
    const from = this.findElement(fromSelector)
    const to = this.findElement(toSelector)

    if (!from || !to) return

    const fromRect = from.getBoundingClientRect()
    const toRect = to.getBoundingClientRect()
    const previewRect = this.previewContainer?.getBoundingClientRect() || { left: 0, top: 0 }

    let value: number
    let x: number, y: number, width: number, height: number

    if (type === 'gap') {
      // Measure gap between elements
      const isHorizontal = Math.abs(fromRect.right - toRect.left) < Math.abs(fromRect.bottom - toRect.top)

      if (isHorizontal) {
        value = toRect.left - fromRect.right
        x = fromRect.right - previewRect.left
        y = Math.min(fromRect.top, toRect.top) - previewRect.top + Math.min(fromRect.height, toRect.height) / 2
        width = value
        height = 1
      } else {
        value = toRect.top - fromRect.bottom
        x = Math.min(fromRect.left, toRect.left) - previewRect.left + Math.min(fromRect.width, toRect.width) / 2
        y = fromRect.bottom - previewRect.top
        width = 1
        height = value
      }
    } else if (type === 'width') {
      value = fromRect.width
      x = fromRect.left - previewRect.left
      y = fromRect.top - previewRect.top - 15
      width = value
      height = 10
    } else {
      value = fromRect.height
      x = fromRect.left - previewRect.left - 15
      y = fromRect.top - previewRect.top
      width = 10
      height = value
    }

    const measureEl = document.createElement('div')
    measureEl.className = 'agent-measurement'
    measureEl.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${Math.max(width, 1)}px;
      height: ${Math.max(height, 1)}px;
      background: #F59E0B;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    const labelEl = document.createElement('span')
    labelEl.textContent = `${Math.round(value)}px`
    labelEl.style.cssText = `
      background: #F59E0B;
      color: white;
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 2px;
      white-space: nowrap;
    `
    measureEl.appendChild(labelEl)

    this.overlayContainer?.appendChild(measureEl)
    this.measureOverlays.push(measureEl)
  }

  clearMeasurements(): void {
    this.measureOverlays.forEach(el => el.remove())
    this.measureOverlays = []
  }

  // ============================================
  // CHANGE INDICATORS
  // ============================================

  showChange(selector: string, type: 'add' | 'modify' | 'delete'): void {
    const element = this.findElement(selector)
    if (!element) return

    const colors = {
      add: '#22C55E',
      modify: '#5BA8F5',
      delete: '#EF4444'
    }

    const icons = {
      add: '+',
      modify: '~',
      delete: '×'
    }

    this.highlight(selector, {
      color: colors[type],
      style: 'pulse',
      duration: 1500,
      label: icons[type]
    })
  }

  // ============================================
  // TOOL FEEDBACK
  // ============================================

  onToolStart(toolName: string, input: any): void {
    // Highlight relevant elements based on tool and input
    const selector = input.selector || input.element1 || input.parent

    if (selector) {
      this.highlight(selector, {
        color: '#5BA8F5',
        style: 'pulse',
        duration: 0 // Keep until tool ends
      })
    }
  }

  onToolEnd(toolName: string, result: any): void {
    this.clearAllHighlights()

    // Show result-specific feedback
    if (result?.commands) {
      for (const cmd of result.commands) {
        if (cmd.nodeId) {
          const type = cmd.type === 'DELETE_NODE' ? 'delete' :
            cmd.type === 'INSERT_COMPONENT' ? 'add' : 'modify'
          this.showChange(`@${cmd.nodeId.replace('line-', '')}`, type)
        }
      }
    }
  }

  onError(message: string): void {
    // Could show error indicator
    console.error('Agent error:', message)
  }

  // ============================================
  // HELPERS
  // ============================================

  private findElement(selector: string): HTMLElement | null {
    if (!this.previewContainer) return null

    // @N - Line number
    if (selector.startsWith('@')) {
      const lineNum = selector.slice(1)
      return this.previewContainer.querySelector(`[data-line="${lineNum}"]`)
    }

    // #id - Named element
    if (selector.startsWith('#')) {
      const id = selector.slice(1)
      return this.previewContainer.querySelector(`[data-name="${id}"]`) ||
        this.previewContainer.querySelector(`#${id}`)
    }

    // Type selector
    if (/^[A-Z]/.test(selector)) {
      const [type, indexStr] = selector.split(':')
      const index = indexStr ? parseInt(indexStr) - 1 : 0
      const elements = this.previewContainer.querySelectorAll(`[data-component="${type}"]`)
      return elements[index] as HTMLElement || null
    }

    // CSS selector fallback
    return this.previewContainer.querySelector(selector)
  }

  // ============================================
  // CLEANUP
  // ============================================

  destroy(): void {
    this.clearAllHighlights()
    this.clearMeasurements()
    this.overlayContainer?.remove()
  }
}

// ============================================
// CSS STYLES (inject once)
// ============================================

const styleId = 'agent-visual-feedback-styles'
if (!document.getElementById(styleId)) {
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @keyframes agent-pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.02);
      }
    }

    .agent-highlight {
      transition: all 0.2s ease;
    }

    .agent-highlight-label {
      font-family: var(--font-sans, system-ui, sans-serif);
      font-weight: 500;
    }

    .agent-measurement {
      transition: all 0.2s ease;
    }
  `
  document.head.appendChild(style)
}

// ============================================
// FACTORY FUNCTION
// ============================================

let instance: VisualFeedbackManager | null = null

export function getVisualFeedbackManager(): VisualFeedbackManager {
  if (!instance) {
    instance = new VisualFeedbackManager()
  }
  return instance
}

export function createVisualFeedbackManager(): VisualFeedbackManager {
  return new VisualFeedbackManager()
}
