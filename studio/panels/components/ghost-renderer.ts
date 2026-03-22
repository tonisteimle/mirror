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

  /**
   * Render a component off-screen and return the element
   */
  async render(item: ComponentItem): Promise<RenderedGhost> {
    // Check cache first
    const cacheKey = this.getCacheKey(item)
    console.log('[GhostRenderer] render cacheKey:', cacheKey)
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

    try {
      // Get Mirror compiler from global scope
      const Mirror = this.getMirror()
      if (!Mirror) {
        throw new Error('Mirror compiler not loaded')
      }

      // Parse and generate DOM code
      const ast = Mirror.parse(code)
      if (ast.errors && ast.errors.length > 0) {
        throw new Error(ast.errors[0].message)
      }

      const jsCode = Mirror.generateDOM(ast)

      // Execute to get UI object
      const execCode = jsCode
        .replace('export function createUI', 'function createUI')
        .replace(/document\.body\.appendChild\([^)]+\)/g, '')

      const fn = new Function(execCode + '\nreturn createUI ? createUI() : null;')
      const ui = fn()

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
      const size = {
        width: Math.max(rect.width, 20), // Minimum 20px
        height: Math.max(rect.height, 20),
      }

      // Clone for return value
      const clone = renderedElement.cloneNode(true) as HTMLElement

      // Cache the result (clone again to keep cache independent)
      this.cache.set(cacheKey, {
        element: clone,
        size: { ...size },
        timestamp: Date.now(),
      })

      // Cleanup the rendered element
      ui.root.remove()

      // Return a fresh clone from cache
      return {
        element: clone.cloneNode(true) as HTMLElement,
        size,
        cleanup: () => {},
      }
    } catch (error) {
      // Fallback: return a placeholder
      console.warn('[GhostRenderer] Failed to render component:', error)
      return this.createFallback(item)
    }
  }

  /**
   * Render synchronously (uses cache only, falls back to default)
   */
  renderSync(item: ComponentItem): RenderedGhost | null {
    const cacheKey = this.getCacheKey(item)
    const cached = this.cache.get(cacheKey)
    console.log('[GhostRenderer] renderSync cacheKey:', cacheKey)
    console.log('[GhostRenderer] cache size:', this.cache.size, 'keys:', [...this.cache.keys()])

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
    // Render items in batches to avoid blocking
    const batchSize = 5
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      await Promise.all(batch.map(item => this.render(item).catch(() => {})))
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 10))
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
    this.cache.clear()
    if (this.measureContainer) {
      this.measureContainer.remove()
      this.measureContainer = null
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private getMirror(): any {
    if (typeof window !== 'undefined' && (window as any).Mirror) {
      return (window as any).Mirror
    }
    // Fallback to MirrorLang
    if (typeof window !== 'undefined' && (window as any).MirrorLang) {
      return (window as any).MirrorLang
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
    // Include all relevant properties in the cache key
    const parts = [
      item.id,
      item.template,
      item.properties || '',
      item.textContent || '',
      JSON.stringify(item.children || []),
    ]
    return parts.join('|')
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
