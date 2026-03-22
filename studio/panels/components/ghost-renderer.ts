/**
 * Ghost Renderer - Renders components off-screen for drag previews
 *
 * Renders ComponentItem off-screen using the Mirror compiler,
 * so drag ghosts show the actual component appearance - identical
 * to dragging existing elements on the canvas.
 */

import type { ComponentItem, ComponentChild } from './types'
import { COMPONENT_DEFAULT_SIZES } from '../../visual/renderers/ghost-factory'

// ============================================================================
// Types
// ============================================================================

export interface RenderedGhost {
  /** The rendered DOM element */
  element: HTMLElement
  /** Measured size */
  size: { width: number; height: number }
  /** Cleanup function to remove off-screen container */
  cleanup: () => void
}

interface CacheEntry {
  element: HTMLElement
  size: { width: number; height: number }
  timestamp: number
}

/** Mirror compiler interface */
interface MirrorCompiler {
  parse(code: string): { errors?: Array<{ message: string }> }
  generateDOM(ast: unknown): string
}

/** Mirror UI object returned by createUI() */
interface MirrorUI {
  root: HTMLElement
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Map layout preset display names to actual Mirror primitives
 * Layout presets use names like "V-Box", "H-Box" for UI display,
 * but they should render as "Box" with layout properties.
 */
const LAYOUT_NAME_TO_PRIMITIVE: Record<string, string> = {
  'V-Box': 'Box',
  'H-Box': 'Box',
  'Absolute': 'Box',
  'ZStack': 'Box',
  'Grid': 'Box',
  'Sidebar': 'Box',
  'Header/Footer': 'Box',
}

/**
 * Get the actual Mirror primitive template for a component
 */
function getActualTemplate(template: string): string {
  return LAYOUT_NAME_TO_PRIMITIVE[template] || template
}

/**
 * Escape text content for use in Mirror DSL strings
 */
function escapeTextContent(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * Get default size for a component based on its template
 */
export function getDefaultSizeForItem(item: ComponentItem): { width: number; height: number } {
  // Use explicit defaultSize if provided
  if (item.defaultSize) {
    return item.defaultSize
  }
  // Look up by template name
  return COMPONENT_DEFAULT_SIZES[item.template] || { width: 100, height: 40 }
}

// ============================================================================
// GhostRenderer
// ============================================================================

export class GhostRenderer {
  private measureContainer: HTMLElement | null = null
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly CLEANUP_INTERVAL = 60 * 1000 // 60 seconds
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null

  /**
   * Render a component off-screen and return the element
   */
  async render(item: ComponentItem): Promise<RenderedGhost> {
    // Start cleanup interval on first render
    this.startCleanup()

    // Check cache first
    const cacheKey = this.getCacheKey(item)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      // Clone the cached element
      const clone = cached.element.cloneNode(true) as HTMLElement
      return {
        element: clone,
        size: { ...cached.size },
        cleanup: () => {},
      }
    }

    // Ensure measure container exists
    const container = this.getOrCreateMeasureContainer()

    // Build Mirror code for the component
    const code = this.buildCode(item)

    // Track UI for cleanup on error
    let ui: MirrorUI | null = null

    try {
      // Get Mirror compiler from global scope
      const Mirror = this.getMirror()
      if (!Mirror) {
        throw new Error('Mirror compiler not loaded')
      }

      // Parse and generate DOM code
      const ast = Mirror.parse(code)
      if (ast.errors && ast.errors.length > 0) {
        throw new Error(`Parse error: ${ast.errors[0].message}`)
      }

      const jsCode = Mirror.generateDOM(ast)

      // Execute to get UI object
      const execCode = jsCode
        .replace('export function createUI', 'function createUI')
        .replace(/document\.body\.appendChild\([^)]+\)/g, '')

      const fn = new Function(execCode + '\nreturn createUI ? createUI() : null;')
      ui = fn() as MirrorUI | null

      if (!ui || !ui.root) {
        throw new Error('Component did not render')
      }

      // Append to measure container
      container.appendChild(ui.root)

      // Wait for styles to apply (with fallback for test environment)
      await new Promise(resolve => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(resolve)
        } else {
          setTimeout(resolve, 16)
        }
      })

      // Get the actual rendered element
      // ui.root is a wrapper div, the actual component is the first child
      const renderedElement = ui.root.firstElementChild as HTMLElement || ui.root

      // Measure size
      const rect = renderedElement.getBoundingClientRect()
      let size = {
        width: Math.max(rect.width, 20), // Minimum 20px
        height: Math.max(rect.height, 20),
      }

      // If measured at minimum size and defaultSize is available, use defaultSize
      // This handles layout presets and components with no intrinsic size
      if (size.width <= 20 && size.height <= 20 && item.defaultSize) {
        size = { ...item.defaultSize }
      }

      // Clone once for cache storage
      const cacheElement = renderedElement.cloneNode(true) as HTMLElement

      // Store in cache
      this.cache.set(cacheKey, {
        element: cacheElement,
        size: { ...size },
        timestamp: Date.now(),
      })

      // Cleanup the rendered element from measure container
      ui.root.remove()

      // Return a fresh clone from the cached element
      return {
        element: cacheElement.cloneNode(true) as HTMLElement,
        size,
        cleanup: () => {},
      }
    } catch (error) {
      // Clean up ui.root if it was appended to DOM
      if (ui?.root?.isConnected) {
        ui.root.remove()
      }

      // Clean up measure container to prevent orphaned elements
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild)
        }
      }

      // Log with context
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(`[GhostRenderer] Failed to render "${item.name}":`, errorMsg)

      return this.createFallback(item)
    }
  }

  /**
   * Render synchronously (uses cache only, falls back to default)
   */
  renderSync(item: ComponentItem): RenderedGhost | null {
    const cacheKey = this.getCacheKey(item)
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      const clone = cached.element.cloneNode(true) as HTMLElement
      return {
        element: clone,
        size: { ...cached.size },
        cleanup: () => {},
      }
    }

    return null
  }

  /**
   * Pre-warm the cache for a list of items
   */
  async warmCache(items: ComponentItem[]): Promise<void> {
    // Start cleanup interval when cache is being used
    this.startCleanup()

    // Track failures for debugging
    const failures: Array<{ name: string; error: string }> = []

    // Render items in batches to avoid blocking
    const batchSize = 5
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      await Promise.all(batch.map(item =>
        this.render(item).catch((error: unknown) => {
          failures.push({
            name: item.name,
            error: error instanceof Error ? error.message : String(error),
          })
        })
      ))
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Log summary if there were failures
    if (failures.length > 0) {
      console.warn(`[GhostRenderer] Cache warm-up: ${failures.length}/${items.length} items failed`)
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopCleanup()
    this.cache.clear()
    if (this.measureContainer) {
      this.measureContainer.remove()
      this.measureContainer = null
    }
  }

  /**
   * Start periodic cache cleanup
   */
  private startCleanup(): void {
    if (this.cleanupIntervalId) return

    this.cleanupIntervalId = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache) {
        if (now - entry.timestamp > this.CACHE_TTL) {
          this.cache.delete(key)
        }
      }
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Stop periodic cache cleanup
   */
  private stopCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private getMirror(): MirrorCompiler | null {
    if (typeof window !== 'undefined' && (window as Record<string, unknown>).Mirror) {
      return (window as Record<string, unknown>).Mirror as MirrorCompiler
    }
    // Fallback to MirrorLang
    if (typeof window !== 'undefined' && (window as Record<string, unknown>).MirrorLang) {
      return (window as Record<string, unknown>).MirrorLang as MirrorCompiler
    }
    return null
  }

  private getOrCreateMeasureContainer(): HTMLElement {
    if (this.measureContainer && this.measureContainer.isConnected) {
      return this.measureContainer
    }

    const container = document.createElement('div')
    container.id = 'ghost-renderer-measure-container'
    Object.assign(container.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: 'auto',
      height: 'auto',
      visibility: 'hidden',
      pointerEvents: 'none',
      zIndex: '-1',
    })
    document.body.appendChild(container)
    this.measureContainer = container
    return container
  }

  private getCacheKey(item: ComponentItem): string {
    // Use item.id as the primary cache key
    // The id is already unique: `palette-${componentName}-${properties}-${textContent}`
    // Don't include children in key - they're baked into the rendered element
    return item.id
  }

  private buildCode(item: ComponentItem): string {
    // Map layout display names to actual Mirror primitives
    let code = getActualTemplate(item.template)

    if (item.properties) {
      code += ` ${item.properties}`
    }

    if (item.textContent) {
      code += ` "${escapeTextContent(item.textContent)}"`
    }

    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        code += '\n' + this.buildChildCode(child, '  ')
      }
    }

    return code
  }

  private buildChildCode(child: ComponentChild, indent: string): string {
    // Map layout display names to actual Mirror primitives
    let code = indent + getActualTemplate(child.template)

    if (child.properties) {
      code += ` ${child.properties}`
    }

    if (child.textContent) {
      code += ` "${escapeTextContent(child.textContent)}"`
    }

    if (child.children && child.children.length > 0) {
      for (const nested of child.children) {
        code += '\n' + this.buildChildCode(nested, indent + '  ')
      }
    }

    return code
  }

  private createFallback(item: ComponentItem): RenderedGhost {
    const element = document.createElement('div')
    element.className = 'ghost-renderer-fallback'

    const size = item.defaultSize || { width: 100, height: 40 }

    Object.assign(element.style, {
      width: `${size.width}px`,
      height: `${size.height}px`,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      border: '2px dashed #3b82f6',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      color: '#3b82f6',
      fontFamily: 'system-ui, sans-serif',
    })

    element.textContent = item.name

    return {
      element,
      size,
      cleanup: () => {},
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: GhostRenderer | null = null

export function getGhostRenderer(): GhostRenderer {
  if (!instance) {
    instance = new GhostRenderer()
  }
  return instance
}

export function resetGhostRenderer(): void {
  instance?.dispose()
  instance = null
}
