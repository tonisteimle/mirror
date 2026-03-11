/**
 * Property Panel Module
 *
 * Displays and edits properties for selected elements.
 */

import { UIRenderer, type UIRendererConfig } from './ui-renderer'
import { ChangeHandler, type ChangeHandlerDependencies } from './change-handler'
import type {
  PropertyPanelConfig,
  PropertyPanelCallbacks,
  ExtractedElement,
  CodeModifier,
  ModificationResult,
} from './types'
import type { PropertyExtractor } from '../../../src/studio/property-extractor'

export type { PropertyPanelConfig, PropertyPanelCallbacks, ExtractedElement }
export { UIRenderer, ChangeHandler }

export class PropertyPanel {
  private container: HTMLElement
  private config: Required<PropertyPanelConfig>
  private callbacks: PropertyPanelCallbacks
  private uiRenderer: UIRenderer
  private changeHandler: ChangeHandler | null = null

  private currentNodeId: string | null = null
  private currentElement: ExtractedElement | null = null
  private extractor: PropertyExtractor | null = null
  private modifier: CodeModifier | null = null

  constructor(config: PropertyPanelConfig, callbacks: PropertyPanelCallbacks) {
    this.container = config.container
    this.config = {
      showCategories: true,
      showChildList: true,
      showActions: true,
      enableDragDrop: true,
      showBreadcrumb: true,
      ...config,
    }
    this.callbacks = callbacks

    this.uiRenderer = new UIRenderer({
      showIcons: true,
      collapsibleCategories: true,
      inlineEditing: true,
    })

    this.container.classList.add('property-panel')
  }

  /**
   * Set dependencies (called after compilation)
   */
  setDependencies(
    extractor: PropertyExtractor,
    modifier: CodeModifier
  ): void {
    this.extractor = extractor
    this.modifier = modifier

    this.changeHandler = new ChangeHandler({
      getModifier: () => this.modifier!,
      onSourceChange: (result) => {
        if (result.success && result.newSource) {
          // Trigger recompilation
          this.callbacks.onPropertyChange(
            this.currentNodeId!,
            '',
            '',
            result
          )
        }
      },
    })

    // Refresh if we have a current selection
    if (this.currentNodeId) {
      this.refresh()
    }
  }

  /**
   * Update dependencies (on recompilation)
   */
  updateDependencies(extractor: PropertyExtractor, modifier: CodeModifier): void {
    this.extractor = extractor
    this.modifier = modifier

    if (this.currentNodeId) {
      this.refresh()
    }
  }

  /**
   * Show properties for a node
   */
  show(nodeId: string): void {
    this.currentNodeId = nodeId
    this.refresh()
  }

  /**
   * Hide the panel
   */
  hide(): void {
    this.currentNodeId = null
    this.currentElement = null
    this.container.innerHTML = ''
    this.container.classList.remove('visible')
  }

  /**
   * Refresh the panel with current node
   */
  refresh(): void {
    if (!this.currentNodeId || !this.extractor) {
      this.hide()
      return
    }

    // Extract element info
    const element = this.extractor.getProperties(this.currentNodeId)
    if (!element) {
      this.hide()
      return
    }

    this.currentElement = element
    this.render()
  }

  /**
   * Clear the panel
   */
  clear(): void {
    this.hide()
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.currentNodeId !== null
  }

  /**
   * Get current node ID
   */
  getCurrentNodeId(): string | null {
    return this.currentNodeId
  }

  private render(): void {
    if (!this.currentElement) return

    this.container.innerHTML = ''
    this.container.classList.add('visible')

    // Render content
    const content = this.uiRenderer.render(this.currentElement, {
      onPropertyChange: (property, value) => {
        if (!this.changeHandler || !this.currentNodeId) return

        const result = this.modifier?.updateProperty(this.currentNodeId, property, value)
        if (result) {
          this.callbacks.onPropertyChange(this.currentNodeId, property, value, result)
        }
      },

      onPropertyRemove: (property) => {
        if (!this.changeHandler || !this.currentNodeId) return

        const result = this.modifier?.removeProperty(this.currentNodeId, property)
        if (result) {
          this.callbacks.onPropertyRemove(this.currentNodeId, property, result)
        }
      },

      onChildSelect: (childId) => {
        this.callbacks.onNodeSelect?.(childId)
      },
    })

    this.container.appendChild(content)
  }
}

/**
 * Factory function
 */
export function createPropertyPanel(
  config: PropertyPanelConfig,
  callbacks: PropertyPanelCallbacks
): PropertyPanel {
  return new PropertyPanel(config, callbacks)
}
