/**
 * Property Panel (New Architecture)
 *
 * Backwards-compatible wrapper that uses the new hexagonal architecture
 * internally while exposing the same interface as the legacy PropertyPanel.
 */

import type {
  PropertyExtractor,
  ExtractedElement,
  CodeModifier,
  ModificationResult,
} from '../../code-modifier'
import type { PropertyPanelPorts } from './ports'
import {
  createProductionPorts,
  type SelectionProvider,
  type ProductionPortsConfig,
} from './adapters/production-adapters'
import { PropertyPanelView, createPropertyPanelView } from './view'
import { state, events } from '../../core'

// ============================================
// Helpers
// ============================================

/**
 * Robust fallback for getAllSource when callback is not provided.
 * Uses window.desktopFiles if available, otherwise returns current source.
 * This ensures tokens from all project files are available.
 */
function getDefaultAllSource(): string {
  // Try to get all files from desktop-files module (includes all preloaded files)
  const desktopFiles = (window as any).desktopFiles?.getFiles?.()
  if (desktopFiles && typeof desktopFiles === 'object') {
    // Concatenate all file contents (tokens should be included)
    return Object.values(desktopFiles).filter(Boolean).join('\n')
  }
  // Fallback to current source only (not ideal, but better than nothing)
  return state.get().source
}

// ============================================
// Types (re-exported for backwards compatibility)
// ============================================

export type OnCodeChangeCallback = (result: ModificationResult) => void

export type GetAllSourceCallback = () => string

export interface PropertyPanelOptions {
  /** Debounce time for property changes (ms) */
  debounceTime?: number
  /** Show source indicators (definition vs instance) */
  showSourceIndicators?: boolean
  /** Callback to get all source code (for token extraction) */
  getAllSource?: GetAllSourceCallback
}

// ============================================
// Property Panel Class
// ============================================

/**
 * Property Panel - displays and edits properties for selected elements.
 *
 * This is the new implementation using hexagonal architecture.
 * It maintains backwards compatibility with the legacy interface.
 */
export class PropertyPanel {
  private container: HTMLElement
  private view: PropertyPanelView
  private ports: PropertyPanelPorts
  private selectionManager: SelectionProvider
  private propertyExtractor: PropertyExtractor
  private codeModifier: CodeModifier
  private onCodeChange: OnCodeChangeCallback
  private options: PropertyPanelOptions

  constructor(
    container: HTMLElement,
    selectionManager: SelectionProvider,
    propertyExtractor: PropertyExtractor,
    codeModifier: CodeModifier,
    onCodeChange: OnCodeChangeCallback,
    options: PropertyPanelOptions = {}
  ) {
    // Store dependencies for updateDependencies()
    this.container = container
    this.selectionManager = selectionManager
    this.propertyExtractor = propertyExtractor
    this.codeModifier = codeModifier
    this.onCodeChange = onCodeChange
    this.options = options

    // Create production ports
    this.ports = createProductionPorts({
      selectionProvider: selectionManager,
      propertyExtractor,
      codeModifier,
      onCodeChange: result => {
        // Call the provided callback
        onCodeChange(result)

        // Also emit events for state synchronization
        if (result.success && result.newSource) {
          state.set({ source: result.newSource })
          events.emit('source:changed', { source: result.newSource, origin: 'panel' })
          events.emit('compile:requested', {})
        } else if (!result.success) {
          events.emit('notification:error', {
            message: result.error || 'Failed to update property',
          })
        }
      },
      getAllSource: options.getAllSource ?? getDefaultAllSource,
    })

    // Create view
    this.view = createPropertyPanelView(container, this.ports, {
      debounceTime: options.debounceTime,
    })

    // Auto-attach for backwards compatibility with legacy PropertyPanel
    // The old implementation rendered immediately in the constructor
    this.attach()
  }

  /**
   * Attach to selection manager and start listening.
   */
  attach(): void {
    this.view.init()
  }

  /**
   * Detach from selection manager and clean up.
   */
  detach(): void {
    this.view.dispose()
  }

  /**
   * Show properties for a component definition.
   * Used when cursor is on a definition line in editor.
   */
  showComponentDefinition(componentName: string): boolean {
    // Check if the component definition exists
    const element = this.ports.extraction.getPropertiesForDefinition(componentName)
    if (!element) {
      return false
    }
    // Trigger definition selected event which controller handles
    events.emit('definition:selected', { componentName, origin: 'editor' })
    return true
  }

  /**
   * Get the currently displayed element.
   */
  getCurrentElement(): ExtractedElement | null {
    return this.view.getController().getCurrentElement()
  }

  /**
   * Refresh the panel (re-fetch current element).
   */
  refresh(): void {
    this.view.getController().refresh()
  }

  /**
   * Change a property value.
   * Used by Test API for programmatic property changes.
   */
  changeProperty(name: string, value: string): void {
    this.view.getController().changeProperty(name, value)
  }

  /**
   * Remove a property.
   * Used by Test API for programmatic property removal.
   */
  removeProperty(name: string): void {
    this.view.getController().removeProperty(name)
  }

  /**
   * Toggle a boolean property.
   * Used by Test API for programmatic property toggling.
   */
  toggleProperty(name: string, enabled: boolean): void {
    this.view.getController().toggleProperty(name, enabled)
  }

  /**
   * Toggle a section's expanded state.
   * Used by Test API.
   */
  toggleSection(sectionName: string): void {
    this.view.getController().toggleSection(sectionName)
  }

  /**
   * Update dependencies after a recompile.
   * Called by bootstrap when AST/SourceMap change.
   */
  updateDependencies(propertyExtractor: PropertyExtractor, codeModifier: CodeModifier): void {
    this.propertyExtractor = propertyExtractor
    this.codeModifier = codeModifier

    // Dispose old view
    this.view.dispose()

    // Recreate ports with new dependencies
    this.ports = createProductionPorts({
      selectionProvider: this.selectionManager,
      propertyExtractor,
      codeModifier,
      onCodeChange: result => {
        this.onCodeChange(result)
        if (result.success && result.newSource) {
          state.set({ source: result.newSource })
          events.emit('source:changed', { source: result.newSource, origin: 'panel' })
          events.emit('compile:requested', {})
        } else if (!result.success) {
          events.emit('notification:error', {
            message: result.error || 'Failed to update property',
          })
        }
      },
      getAllSource: this.options.getAllSource ?? getDefaultAllSource,
    })

    // Recreate view with new ports
    this.view = createPropertyPanelView(this.container, this.ports, {
      debounceTime: this.options.debounceTime,
    })
    this.view.init()

    // Invalidate token cache to ensure fresh tokens are extracted
    // This is needed because compile:completed fires BEFORE updateDependencies
    // creates the new ports, so the new cache misses that event
    this.ports.tokens.invalidateCache()
  }

  /**
   * Dispose the panel and clean up resources.
   */
  dispose(): void {
    this.detach()
    this.container.innerHTML = ''
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Creates a new PropertyPanel instance.
 * This is the main entry point - same interface as legacy.
 */
export function createPropertyPanel(
  container: HTMLElement,
  selectionManager: SelectionProvider,
  propertyExtractor: PropertyExtractor,
  codeModifier: CodeModifier,
  onCodeChange: OnCodeChangeCallback,
  options?: PropertyPanelOptions
): PropertyPanel {
  // Constructor auto-attaches, so just return the panel
  return new PropertyPanel(
    container,
    selectionManager,
    propertyExtractor,
    codeModifier,
    onCodeChange,
    options
  )
}
