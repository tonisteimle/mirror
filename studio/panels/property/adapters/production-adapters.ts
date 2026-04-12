/**
 * Property Panel Production Adapters
 *
 * Production-Implementierungen aller Ports.
 * Verbinden das Property Panel mit dem echten System.
 */

import type { PropertyExtractor, ExtractedElement } from '../../../../compiler/studio/property-extractor'
import type { CodeModifier, ModificationResult } from '../../../../compiler/studio/code-modifier'
import { isAbsoluteLayoutContainer } from '../../../../compiler/studio/utils/layout-detection'
import { events, state } from '../../../core'
import { TokenCache } from '../utils/tokens'
import type {
  SelectionPort,
  PropertyExtractionPort,
  PropertyModificationPort,
  TokenPort,
  LayoutDetectionPort,
  PanelEventPort,
  PropertyPanelPorts,
  CleanupFn,
  SpacingToken,
  ColorToken,
  PropertyChange,
  Rect
} from '../ports'

// ============================================
// Selection Provider Interface
// ============================================

/**
 * Abstrahiert SelectionManager für Dependency Injection.
 * Entspricht dem StateSelectionAdapter Interface.
 */
export interface SelectionProvider {
  getSelection(): string | null
  subscribe(callback: (nodeId: string | null) => void): () => void
}

// ============================================
// Selection Adapter
// ============================================

export function createSelectionAdapter(selectionProvider: SelectionProvider): SelectionPort {
  let previousSelection: string | null = null

  return {
    subscribe(listener) {
      return selectionProvider.subscribe((nodeId) => {
        const prev = previousSelection
        previousSelection = nodeId
        listener(nodeId, prev)
      })
    },

    getSelection() {
      return selectionProvider.getSelection()
    },

    select(nodeId) {
      // Selection is typically managed externally
      // This is a read-mostly port
      console.warn('[SelectionAdapter] Direct selection not supported - use SelectionManager')
    },

    clearSelection() {
      // Selection is typically managed externally
      console.warn('[SelectionAdapter] Direct clear not supported - use SelectionManager')
    }
  }
}

// ============================================
// Property Extraction Adapter
// ============================================

export function createExtractionAdapter(propertyExtractor: PropertyExtractor): PropertyExtractionPort {
  return {
    getProperties(nodeId) {
      return propertyExtractor.getProperties(nodeId)
    },

    getPropertiesForDefinition(componentName) {
      return propertyExtractor.getPropertiesForComponentDefinition(componentName)
    }
  }
}

// ============================================
// Property Modification Adapter
// ============================================

export interface ModificationAdapterOptions {
  /** Callback when code changes */
  onCodeChange: (result: ModificationResult) => void
}

export function createModificationAdapter(
  codeModifier: CodeModifier,
  options: ModificationAdapterOptions
): PropertyModificationPort {
  const { onCodeChange } = options

  return {
    setProperty(nodeId, name, value) {
      const result = codeModifier.updateProperty(nodeId, name, value)
      onCodeChange(result)
      return result
    },

    removeProperty(nodeId, name) {
      const result = codeModifier.removeProperty(nodeId, name)
      onCodeChange(result)
      return result
    },

    toggleProperty(nodeId, name, enabled) {
      // Toggle is implemented as updateProperty with empty value (enabled) or removeProperty (disabled)
      if (enabled) {
        const result = codeModifier.addProperty(nodeId, name, '')
        onCodeChange(result)
        return result
      } else {
        const result = codeModifier.removeProperty(nodeId, name)
        onCodeChange(result)
        return result
      }
    },

    batchUpdate(nodeId, changes) {
      // Apply changes sequentially for now
      // TODO: Implement true batch update in CodeModifier
      let lastResult: ModificationResult = {
        success: false,
        newSource: '',
        change: { from: 0, to: 0, insert: '' }
      }

      for (const change of changes) {
        switch (change.action) {
          case 'set':
            lastResult = codeModifier.updateProperty(nodeId, change.name, change.value)
            break
          case 'remove':
            lastResult = codeModifier.removeProperty(nodeId, change.name)
            break
          case 'toggle':
            if (change.value === 'true') {
              lastResult = codeModifier.addProperty(nodeId, change.name, '')
            } else {
              lastResult = codeModifier.removeProperty(nodeId, change.name)
            }
            break
        }

        if (!lastResult.success) {
          onCodeChange(lastResult)
          return lastResult
        }
      }

      onCodeChange(lastResult)
      return lastResult
    }
  }
}

// ============================================
// Token Adapter
// ============================================

export interface TokenAdapterOptions {
  /** Callback to get all source code (including imports) */
  getAllSource: () => string
}

export function createTokenAdapter(options: TokenAdapterOptions): TokenPort {
  const tokenCache = new TokenCache()
  const { getAllSource } = options

  return {
    getSpacingTokens(propType) {
      return tokenCache.getSpacingTokens(propType, getAllSource)
    },

    getColorTokens() {
      return tokenCache.getColorTokens(getAllSource)
    },

    resolveTokenValue(tokenRef) {
      return tokenCache.resolveTokenValue(tokenRef, getAllSource)
    },

    invalidateCache() {
      tokenCache.invalidate()
    }
  }
}

// ============================================
// Layout Detection Adapter
// ============================================

export interface LayoutAdapterOptions {
  /** Preview container element ID */
  previewContainerId?: string
}

export function createLayoutAdapter(options: LayoutAdapterOptions = {}): LayoutDetectionPort {
  const { previewContainerId = 'preview' } = options

  function getPreviewContainer(): HTMLElement | null {
    return document.getElementById(previewContainerId)
  }

  function getElementByNodeId(nodeId: string): HTMLElement | null {
    const container = getPreviewContainer()
    return container?.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
  }

  return {
    isInPositionedContainer(nodeId) {
      const element = getElementByNodeId(nodeId)
      if (!element) return false

      const parent = element.parentElement
      if (!parent) return false

      return isAbsoluteLayoutContainer(parent)
    },

    getParentLayoutType(nodeId) {
      const element = getElementByNodeId(nodeId)
      if (!element) return 'none'

      const parent = element.parentElement
      if (!parent) return 'none'

      const style = window.getComputedStyle(parent)
      const display = style.display

      if (display === 'grid') return 'grid'
      if (display === 'flex') return 'flex'
      if (isAbsoluteLayoutContainer(parent)) return 'positioned'

      return 'none'
    },

    getElementRect(nodeId) {
      const element = getElementByNodeId(nodeId)
      if (!element) return null

      const rect = element.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      }
    }
  }
}

// ============================================
// Panel Event Adapter
// ============================================

export function createEventAdapter(): PanelEventPort {
  return {
    onSelectionInvalidated(handler) {
      return events.on('selection:invalidated', ({ nodeId }) => {
        handler(nodeId)
      })
    },

    onCompileCompleted(handler) {
      return events.on('compile:completed', () => {
        handler()
      })
    },

    onDefinitionSelected(handler) {
      return events.on('definition:selected', ({ componentName }) => {
        handler(componentName)
      })
    },

    isCompiling() {
      return state.get().compiling
    }
  }
}

// ============================================
// Combined Production Ports Factory
// ============================================

export interface ProductionPortsConfig {
  /** Selection provider (StateSelectionAdapter) */
  selectionProvider: SelectionProvider
  /** Property extractor instance */
  propertyExtractor: PropertyExtractor
  /** Code modifier instance */
  codeModifier: CodeModifier
  /** Callback when code changes */
  onCodeChange: (result: ModificationResult) => void
  /** Callback to get all source code */
  getAllSource: () => string
  /** Preview container ID (optional) */
  previewContainerId?: string
}

/**
 * Creates all production ports for the Property Panel.
 */
export function createProductionPorts(config: ProductionPortsConfig): PropertyPanelPorts {
  return {
    selection: createSelectionAdapter(config.selectionProvider),
    extraction: createExtractionAdapter(config.propertyExtractor),
    modification: createModificationAdapter(config.codeModifier, {
      onCodeChange: config.onCodeChange
    }),
    tokens: createTokenAdapter({
      getAllSource: config.getAllSource
    }),
    layout: createLayoutAdapter({
      previewContainerId: config.previewContainerId
    }),
    events: createEventAdapter()
  }
}
