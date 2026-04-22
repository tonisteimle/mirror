// @ts-nocheck
/**
 * Splitter Component (Zag.js)
 *
 * Resizable panel layout for Mirror Studio.
 * Uses @zag-js/splitter for state management.
 */

import * as splitter from '@zag-js/splitter'

// ============================================================================
// Types
// ============================================================================

export interface PanelConfig {
  /** Unique panel ID */
  id: string
  /** Minimum size in percentage (0-100) */
  minSize?: number
  /** Maximum size in percentage (0-100) */
  maxSize?: number
  /** Whether panel can be collapsed */
  collapsible?: boolean
  /** Size when collapsed (percentage) */
  collapsedSize?: number
}

export interface SplitterConfig {
  /** Unique ID for the splitter instance */
  id: string
  /** Panel configurations */
  panels: PanelConfig[]
  /** Initial sizes (must match panels.length) */
  defaultSizes?: number[]
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
}

export interface SplitterCallbacks {
  /** Called when sizes change */
  onSizeChange?: (sizes: number[]) => void
  /** Called when a panel is collapsed/expanded */
  onCollapse?: (panelId: string, collapsed: boolean) => void
}

// ============================================================================
// Component
// ============================================================================

export class ZagSplitter {
  private service: splitter.Service | null = null
  private config: SplitterConfig
  private callbacks: SplitterCallbacks
  private resizeTriggers: Map<string, HTMLElement> = new Map()

  constructor(config: SplitterConfig, callbacks: SplitterCallbacks = {}) {
    this.config = config
    this.callbacks = callbacks
  }

  /**
   * Initialize the splitter (headless - doesn't render, just manages state)
   */
  init(): this {
    // Build panels config for Zag
    const panels = this.config.panels.map(p => ({
      id: p.id,
      minSize: p.minSize ?? 5,
      maxSize: p.maxSize ?? 95,
      collapsible: p.collapsible ?? false,
      collapsedSize: p.collapsedSize ?? 0,
    }))

    this.service = splitter.machine({
      id: this.config.id,
      panels,
      defaultSize: this.config.defaultSizes,
      orientation: this.config.orientation ?? 'horizontal',
      onSizeChange: details => {
        this.callbacks.onSizeChange?.(details.size)
      },
    })

    this.service.subscribe(() => {
      this.updateLayout()
    })

    this.service.start()
    return this
  }

  /**
   * Get the Zag API for prop spreading
   */
  getApi(): splitter.Api {
    if (!this.service) throw new Error('Splitter not initialized')
    return splitter.connect(this.service.getState(), this.service.send)
  }

  /**
   * Bind a panel element to this splitter
   */
  bindPanel(panelId: string, element: HTMLElement): void {
    const api = this.getApi()
    const props = api.getPanelProps({ id: panelId })
    this.spreadProps(element, props)
  }

  /**
   * Bind a resize trigger element
   */
  bindResizeTrigger(beforePanelId: string, afterPanelId: string, element: HTMLElement): void {
    const api = this.getApi()
    const props = api.getResizeTriggerProps({ id: `${beforePanelId}:${afterPanelId}` })
    this.spreadProps(element, props)
    this.resizeTriggers.set(`${beforePanelId}:${afterPanelId}`, element)
  }

  /**
   * Get current panel sizes
   */
  getSizes(): number[] {
    return this.getApi().size
  }

  /**
   * Set panel sizes programmatically
   */
  setSizes(sizes: number[]): void {
    this.getApi().setSizes(sizes)
  }

  /**
   * Resize a specific panel
   */
  resizePanel(panelId: string, size: number): void {
    this.getApi().resizePanel(panelId, size)
  }

  /**
   * Collapse a panel
   */
  collapsePanel(panelId: string): void {
    this.getApi().collapsePanel(panelId)
  }

  /**
   * Expand a panel
   */
  expandPanel(panelId: string): void {
    this.getApi().expandPanel(panelId)
  }

  /**
   * Toggle panel collapsed state
   */
  togglePanel(panelId: string): void {
    this.getApi().togglePanel(panelId)
  }

  /**
   * Check if panel is collapsed
   */
  isPanelCollapsed(panelId: string): boolean {
    return this.getApi().isPanelCollapsed(panelId)
  }

  /**
   * Update layout based on current state
   */
  private updateLayout(): void {
    if (!this.service) return

    const api = this.getApi()
    const sizes = api.size

    // Update resize trigger attributes
    for (const [key, element] of this.resizeTriggers) {
      const props = api.getResizeTriggerProps({ id: key })
      this.spreadProps(element, props)
    }
  }

  /**
   * Helper: Spread Zag props onto element
   */
  private spreadProps(el: HTMLElement, props: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value)
      } else if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase()
        // Remove old listener and add new one
        const handler = value as EventListener
        el.removeEventListener(event, handler)
        el.addEventListener(event, handler)
      } else if (
        key.startsWith('data-') ||
        key.startsWith('aria-') ||
        key === 'role' ||
        key === 'id' ||
        key === 'tabindex'
      ) {
        el.setAttribute(key, String(value))
      } else if (typeof value === 'boolean') {
        if (value) {
          el.setAttribute(key, '')
        } else {
          el.removeAttribute(key)
        }
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.service?.stop()
    this.service = null
    this.resizeTriggers.clear()
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSplitter(config: SplitterConfig, callbacks?: SplitterCallbacks): ZagSplitter {
  return new ZagSplitter(config, callbacks)
}

// ============================================================================
// Studio Layout Splitter (Pre-configured for Mirror Studio)
// ============================================================================

export interface StudioLayoutConfig {
  /** Sidebar element */
  sidebar: HTMLElement
  /** Sidebar divider */
  sidebarDivider: HTMLElement
  /** Editor panel */
  editor: HTMLElement
  /** Editor divider */
  editorDivider: HTMLElement
  /** Preview panel */
  preview: HTMLElement
  /** Property panel (fixed width, not resizable) */
  propertyPanel: HTMLElement
}

export interface StudioLayoutCallbacks {
  /** Called when layout changes */
  onLayoutChange?: (sizes: { sidebar: number; editor: number; preview: number }) => void
}

/**
 * Create and initialize the studio layout splitter
 */
export function createStudioSplitter(
  config: StudioLayoutConfig,
  callbacks: StudioLayoutCallbacks = {}
): ZagSplitter {
  const splitter = new ZagSplitter(
    {
      id: 'studio-layout',
      panels: [
        { id: 'sidebar', minSize: 10, maxSize: 30, collapsible: true, collapsedSize: 0 },
        { id: 'editor', minSize: 15, maxSize: 70 },
        { id: 'preview', minSize: 15, maxSize: 70 },
      ],
      defaultSizes: [20, 40, 40], // 20% sidebar, 40% editor, 40% preview
      orientation: 'horizontal',
    },
    {
      onSizeChange: sizes => {
        callbacks.onLayoutChange?.({
          sidebar: sizes[0],
          editor: sizes[1],
          preview: sizes[2],
        })
      },
    }
  )

  splitter.init()

  // Bind panels
  splitter.bindPanel('sidebar', config.sidebar)
  splitter.bindPanel('editor', config.editor)
  splitter.bindPanel('preview', config.preview)

  // Bind resize triggers
  splitter.bindResizeTrigger('sidebar', 'editor', config.sidebarDivider)
  splitter.bindResizeTrigger('editor', 'preview', config.editorDivider)

  return splitter
}
