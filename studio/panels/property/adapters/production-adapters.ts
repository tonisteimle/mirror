/**
 * Property Panel Production Adapters
 *
 * Production-Implementierungen aller Ports.
 * Verbinden das Property Panel mit dem echten System.
 */

import type {
  PropertyExtractor,
  ExtractedElement,
  CodeModifier,
  ModificationResult,
} from '../../../core/compiler-types'
import { isAbsoluteLayoutContainer, createLogger } from '../../../core/compiler-types'
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
  Rect,
} from '../ports'

const log = createLogger('SelectionAdapter')

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
      return selectionProvider.subscribe(nodeId => {
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
      log.warn('Direct selection not supported - use SelectionManager')
    },

    clearSelection() {
      // Selection is typically managed externally
      log.warn('Direct clear not supported - use SelectionManager')
    },
  }
}

// ============================================
// Property Extraction Adapter
// ============================================

export function createExtractionAdapter(
  propertyExtractor: PropertyExtractor
): PropertyExtractionPort {
  return {
    getProperties(nodeId) {
      return propertyExtractor.getProperties(nodeId)
    },

    getPropertiesForDefinition(componentName) {
      return propertyExtractor.getPropertiesForComponentDefinition(componentName)
    },
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
      // Atomic batch via CodeModifier.applyBatchChanges — snapshots once,
      // restores on any per-step failure, returns a single whole-file
      // diff so editor/undo treats the whole batch as one step.
      const result = codeModifier.applyBatchChanges(nodeId, changes)
      onCodeChange(result)
      return result
    },
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

    resolveTokenValue(tokenRef, propType) {
      return tokenCache.resolveTokenValue(tokenRef, getAllSource, propType)
    },

    invalidateCache() {
      tokenCache.invalidate()
    },
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
      if (!element?.parentElement) return 'none'
      const display = window.getComputedStyle(element.parentElement).display
      if (display === 'grid') return 'grid'
      if (display === 'flex') return 'flex'
      return isAbsoluteLayoutContainer(element.parentElement) ? 'positioned' : 'none'
    },

    getElementRect(nodeId) {
      const element = getElementByNodeId(nodeId)
      if (!element) return null

      const rect = element.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    },
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
    },
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
      onCodeChange: config.onCodeChange,
    }),
    tokens: createTokenAdapter({ getAllSource: config.getAllSource }),
    layout: createLayoutAdapter({ previewContainerId: config.previewContainerId }),
    events: createEventAdapter(),
  }
}
