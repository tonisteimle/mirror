/**
 * Property Panel Mock Adapters
 *
 * Mock-Implementierungen aller Ports für Unit-Tests.
 * Ermöglichen vollständige Testbarkeit ohne DOM, ohne globalen State.
 */

import type { ExtractedElement, ExtractedProperty, PropertyCategory } from '../../../../compiler/studio/property-extractor'
import type { ModificationResult } from '../../../../compiler/studio/code-modifier'
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
// Mock Selection Port
// ============================================

export interface MockSelectionPortState {
  currentSelection: string | null
  selectionHistory: (string | null)[]
}

export interface MockSelectionPort extends SelectionPort {
  _state: MockSelectionPortState
  _listeners: Set<(nodeId: string | null, previousNodeId: string | null) => void>
  _simulateSelect(nodeId: string | null): void
}

export function createMockSelectionPort(initialSelection: string | null = null): MockSelectionPort {
  const state: MockSelectionPortState = {
    currentSelection: initialSelection,
    selectionHistory: [initialSelection]
  }

  const listeners = new Set<(nodeId: string | null, previousNodeId: string | null) => void>()

  return {
    _state: state,
    _listeners: listeners,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getSelection() {
      return state.currentSelection
    },

    select(nodeId) {
      const previous = state.currentSelection
      state.currentSelection = nodeId
      state.selectionHistory.push(nodeId)
      listeners.forEach(l => l(nodeId, previous))
    },

    clearSelection() {
      this.select(null)
    },

    _simulateSelect(nodeId) {
      this.select(nodeId)
    }
  }
}

// ============================================
// Mock Property Extraction Port
// ============================================

export interface MockExtractionPortState {
  elements: Map<string, ExtractedElement>
  definitions: Map<string, ExtractedElement>
  getCalls: string[]
}

export interface MockExtractionPort extends PropertyExtractionPort {
  _state: MockExtractionPortState
  _addElement(nodeId: string, element: ExtractedElement): void
  _addDefinition(name: string, element: ExtractedElement): void
  _clear(): void
}

export function createMockExtractionPort(): MockExtractionPort {
  const state: MockExtractionPortState = {
    elements: new Map(),
    definitions: new Map(),
    getCalls: []
  }

  return {
    _state: state,

    getProperties(nodeId) {
      state.getCalls.push(nodeId)
      return state.elements.get(nodeId) ?? null
    },

    getPropertiesForDefinition(componentName) {
      return state.definitions.get(componentName) ?? null
    },

    _addElement(nodeId, element) {
      state.elements.set(nodeId, element)
    },

    _addDefinition(name, element) {
      state.definitions.set(name, element)
    },

    _clear() {
      state.elements.clear()
      state.definitions.clear()
      state.getCalls.length = 0
    }
  }
}

// ============================================
// Mock Property Modification Port
// ============================================

export interface MockModificationPortState {
  modifications: Array<{
    nodeId: string
    type: 'set' | 'remove' | 'toggle' | 'batch'
    name?: string
    value?: string
    enabled?: boolean
    changes?: PropertyChange[]
  }>
  shouldFail: boolean
  lastResult: ModificationResult | null
}

export interface MockModificationPort extends PropertyModificationPort {
  _state: MockModificationPortState
  _setShouldFail(fail: boolean): void
  _getModifications(): MockModificationPortState['modifications']
  _clear(): void
}

export function createMockModificationPort(): MockModificationPort {
  const state: MockModificationPortState = {
    modifications: [],
    shouldFail: false,
    lastResult: null
  }

  const createResult = (success: boolean): ModificationResult => ({
    success,
    newSource: success ? 'modified source' : '',
    change: { from: 0, to: 0, insert: '' },
    error: success ? undefined : 'Mock error'
  })

  return {
    _state: state,

    setProperty(nodeId, name, value) {
      state.modifications.push({ nodeId, type: 'set', name, value })
      const result = createResult(!state.shouldFail)
      state.lastResult = result
      return result
    },

    removeProperty(nodeId, name) {
      state.modifications.push({ nodeId, type: 'remove', name })
      const result = createResult(!state.shouldFail)
      state.lastResult = result
      return result
    },

    toggleProperty(nodeId, name, enabled) {
      state.modifications.push({ nodeId, type: 'toggle', name, enabled })
      const result = createResult(!state.shouldFail)
      state.lastResult = result
      return result
    },

    batchUpdate(nodeId, changes) {
      state.modifications.push({ nodeId, type: 'batch', changes })
      const result = createResult(!state.shouldFail)
      state.lastResult = result
      return result
    },

    _setShouldFail(fail) {
      state.shouldFail = fail
    },

    _getModifications() {
      return state.modifications
    },

    _clear() {
      state.modifications.length = 0
      state.shouldFail = false
      state.lastResult = null
    }
  }
}

// ============================================
// Mock Token Port
// ============================================

export interface MockTokenPortState {
  spacingTokens: Map<string, SpacingToken[]>
  colorTokens: ColorToken[]
  tokenValues: Map<string, string>
  cacheInvalidated: boolean
}

export interface MockTokenPort extends TokenPort {
  _state: MockTokenPortState
  _setSpacingTokens(propType: string, tokens: SpacingToken[]): void
  _setColorTokens(tokens: ColorToken[]): void
  _setTokenValue(ref: string, value: string): void
  _clear(): void
}

export function createMockTokenPort(): MockTokenPort {
  const state: MockTokenPortState = {
    spacingTokens: new Map(),
    colorTokens: [],
    tokenValues: new Map(),
    cacheInvalidated: false
  }

  return {
    _state: state,

    getSpacingTokens(propType) {
      return state.spacingTokens.get(propType) ?? []
    },

    getColorTokens() {
      return state.colorTokens
    },

    resolveTokenValue(tokenRef) {
      return state.tokenValues.get(tokenRef) ?? null
    },

    invalidateCache() {
      state.cacheInvalidated = true
    },

    _setSpacingTokens(propType, tokens) {
      state.spacingTokens.set(propType, tokens)
    },

    _setColorTokens(tokens) {
      state.colorTokens = tokens
    },

    _setTokenValue(ref, value) {
      state.tokenValues.set(ref, value)
    },

    _clear() {
      state.spacingTokens.clear()
      state.colorTokens.length = 0
      state.tokenValues.clear()
      state.cacheInvalidated = false
    }
  }
}

// ============================================
// Mock Layout Detection Port
// ============================================

export interface MockLayoutPortState {
  positionedContainers: Set<string>
  parentLayoutTypes: Map<string, 'flex' | 'grid' | 'positioned' | 'none'>
  elementRects: Map<string, Rect>
}

export interface MockLayoutPort extends LayoutDetectionPort {
  _state: MockLayoutPortState
  _setInPositionedContainer(nodeId: string, isPositioned: boolean): void
  _setParentLayoutType(nodeId: string, layoutType: 'flex' | 'grid' | 'positioned' | 'none'): void
  _setElementRect(nodeId: string, rect: Rect): void
  _clear(): void
}

export function createMockLayoutPort(): MockLayoutPort {
  const state: MockLayoutPortState = {
    positionedContainers: new Set(),
    parentLayoutTypes: new Map(),
    elementRects: new Map()
  }

  return {
    _state: state,

    isInPositionedContainer(nodeId) {
      return state.positionedContainers.has(nodeId)
    },

    getParentLayoutType(nodeId) {
      return state.parentLayoutTypes.get(nodeId) ?? 'none'
    },

    getElementRect(nodeId) {
      return state.elementRects.get(nodeId) ?? null
    },

    _setInPositionedContainer(nodeId, isPositioned) {
      if (isPositioned) {
        state.positionedContainers.add(nodeId)
      } else {
        state.positionedContainers.delete(nodeId)
      }
    },

    _setParentLayoutType(nodeId, layoutType) {
      state.parentLayoutTypes.set(nodeId, layoutType)
    },

    _setElementRect(nodeId, rect) {
      state.elementRects.set(nodeId, rect)
    },

    _clear() {
      state.positionedContainers.clear()
      state.parentLayoutTypes.clear()
      state.elementRects.clear()
    }
  }
}

// ============================================
// Mock Panel Event Port
// ============================================

export interface MockEventPortState {
  isCompiling: boolean
  selectionInvalidatedHandlers: Set<(nodeId: string) => void>
  compileCompletedHandlers: Set<() => void>
  definitionSelectedHandlers: Set<(name: string) => void>
}

export interface MockEventPort extends PanelEventPort {
  _state: MockEventPortState
  _setCompiling(compiling: boolean): void
  _triggerSelectionInvalidated(nodeId: string): void
  _triggerCompileCompleted(): void
  _triggerDefinitionSelected(componentName: string): void
  _clear(): void
}

export function createMockEventPort(): MockEventPort {
  const state: MockEventPortState = {
    isCompiling: false,
    selectionInvalidatedHandlers: new Set(),
    compileCompletedHandlers: new Set(),
    definitionSelectedHandlers: new Set()
  }

  return {
    _state: state,

    onSelectionInvalidated(handler) {
      state.selectionInvalidatedHandlers.add(handler)
      return () => state.selectionInvalidatedHandlers.delete(handler)
    },

    onCompileCompleted(handler) {
      state.compileCompletedHandlers.add(handler)
      return () => state.compileCompletedHandlers.delete(handler)
    },

    onDefinitionSelected(handler) {
      state.definitionSelectedHandlers.add(handler)
      return () => state.definitionSelectedHandlers.delete(handler)
    },

    isCompiling() {
      return state.isCompiling
    },

    _setCompiling(compiling) {
      state.isCompiling = compiling
    },

    _triggerSelectionInvalidated(nodeId) {
      state.selectionInvalidatedHandlers.forEach(h => h(nodeId))
    },

    _triggerCompileCompleted() {
      state.compileCompletedHandlers.forEach(h => h())
    },

    _triggerDefinitionSelected(componentName) {
      state.definitionSelectedHandlers.forEach(h => h(componentName))
    },

    _clear() {
      state.isCompiling = false
      state.selectionInvalidatedHandlers.clear()
      state.compileCompletedHandlers.clear()
      state.definitionSelectedHandlers.clear()
    }
  }
}

// ============================================
// Combined Mock Ports
// ============================================

export interface MockPropertyPanelPorts {
  selection: MockSelectionPort
  extraction: MockExtractionPort
  modification: MockModificationPort
  tokens: MockTokenPort
  layout: MockLayoutPort
  events: MockEventPort
}

export function createMockPorts(): MockPropertyPanelPorts {
  return {
    selection: createMockSelectionPort(),
    extraction: createMockExtractionPort(),
    modification: createMockModificationPort(),
    tokens: createMockTokenPort(),
    layout: createMockLayoutPort(),
    events: createMockEventPort()
  }
}

// ============================================
// Test Helpers
// ============================================

/**
 * Creates a minimal ExtractedElement for testing.
 */
export function createMockElement(
  nodeId: string,
  componentName: string = 'Frame',
  properties: ExtractedProperty[] = [],
  options: Partial<ExtractedElement> = {}
): ExtractedElement {
  return {
    nodeId,
    componentName,
    instanceName: options.instanceName,
    isDefinition: options.isDefinition ?? false,
    isTemplateInstance: options.isTemplateInstance ?? false,
    allProperties: properties,
    categories: groupPropertiesByCategory(properties),
    interactions: options.interactions ?? [],
    events: options.events ?? [],
    ...options
  }
}

/**
 * Creates a minimal ExtractedProperty for testing.
 */
export function createMockProperty(
  name: string,
  value: string,
  options: Partial<ExtractedProperty> = {}
): ExtractedProperty {
  return {
    name,
    value,
    type: options.type ?? 'text',
    hasValue: true,
    source: options.source ?? 'instance',
    category: options.category ?? 'visual',
    line: options.line ?? 0,
    column: options.column ?? 0,
    isToken: options.isToken ?? false,
    ...options
  }
}

/**
 * Category labels for display.
 */
const CATEGORY_LABELS: Record<string, string> = {
  visual: 'Visual',
  layout: 'Layout',
  spacing: 'Spacing',
  typography: 'Typography',
  behavior: 'Behavior',
  other: 'Other'
}

/**
 * Groups properties into categories for ExtractedElement.
 */
function groupPropertiesByCategory(properties: ExtractedProperty[]): PropertyCategory[] {
  const categoryMap = new Map<string, ExtractedProperty[]>()

  for (const prop of properties) {
    const category = prop.category ?? 'other'
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    categoryMap.get(category)!.push(prop)
  }

  return Array.from(categoryMap.entries()).map(([name, props]) => ({
    name,
    label: CATEGORY_LABELS[name] ?? name,
    properties: props
  }))
}
