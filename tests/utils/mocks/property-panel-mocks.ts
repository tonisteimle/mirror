/**
 * Mock Factories for Property Panel Testing
 *
 * Provides mock implementations for PropertyExtractor, CodeModifier,
 * and SelectionProvider.
 */

import { vi } from 'vitest'
import type {
  ExtractedElement,
  ExtractedProperty,
  PropertyCategory,
  PropertyType,
} from '../../../compiler/studio/property-extractor'
import type {
  ModificationResult,
  CodeChange,
} from '../../../compiler/studio/code-modifier'
import type { BreadcrumbItem } from '../../../compiler/studio/selection-manager'

// Use ReturnType to get correct Mock type
type MockFn<T extends (...args: any[]) => any> = ReturnType<typeof vi.fn<T>>

// ============================================
// TYPES
// ============================================

export interface MockPropertyExtractor {
  getProperties: MockFn<(nodeId: string) => ExtractedElement | null>
  getPropertiesForComponentDefinition: MockFn<(name: string) => ExtractedElement | null>
  updateAST: MockFn<(ast: unknown) => void>
  updateSourceMap: MockFn<(sourceMap: unknown) => void>
  getAllElements: MockFn<() => ExtractedElement[]>

  // Test helpers
  _elements: Map<string, ExtractedElement>
  _tokens: string[]
  _setElement: (nodeId: string, element: ExtractedElement) => void
  _setTokens: (tokens: string[]) => void
  _resolveToken: (token: string, suffix: string) => string | undefined
}

export interface MockCodeModifier {
  updateProperty: MockFn<(nodeId: string, prop: string, value: string) => ModificationResult>
  addProperty: MockFn<(nodeId: string, prop: string, value: string) => ModificationResult>
  removeProperty: MockFn<(nodeId: string, prop: string) => ModificationResult>
  updateSource: MockFn<(source: string) => void>
  updateSourceMap: MockFn<(sourceMap: unknown) => void>
  getSource: MockFn<() => string>

  // Test helpers
  _lastUpdate: { nodeId: string; prop: string; value: string } | null
  _source: string
  _updateHistory: Array<{ nodeId: string; prop: string; value: string }>
}

export interface MockSelectionProvider {
  subscribe: MockFn<(listener: (nodeId: string | null, prev: string | null) => void) => () => void>
  subscribeBreadcrumb: MockFn<(listener: (chain: BreadcrumbItem[]) => void) => () => void>
  getSelection: MockFn<() => string | null>
  clearSelection: MockFn<() => void>
  select: MockFn<(nodeId: string | null) => void>

  // Test helpers
  _listeners: Set<(nodeId: string | null, prev: string | null) => void>
  _breadcrumbListeners: Set<(chain: BreadcrumbItem[]) => void>
  _selection: string | null
  _triggerSelection: (nodeId: string | null) => void
  _triggerBreadcrumb: (chain: BreadcrumbItem[]) => void
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Creates a sample ExtractedProperty
 */
export function createSampleProperty(overrides: Partial<ExtractedProperty> = {}): ExtractedProperty {
  return {
    name: 'bg',
    value: '#1a1a1a',
    type: 'color' as PropertyType,
    source: 'instance',
    line: 1,
    column: 5,
    isToken: false,
    hasValue: true,
    ...overrides,
  }
}

/**
 * Creates a sample PropertyCategory
 */
export function createSampleCategory(overrides: Partial<PropertyCategory> = {}): PropertyCategory {
  return {
    name: 'colors',
    label: 'Colors',
    properties: [],
    ...overrides,
  }
}

/**
 * Creates a sample ExtractedElement
 */
export function createSampleElement(overrides: Partial<ExtractedElement> = {}): ExtractedElement {
  return {
    nodeId: 'node-1',
    componentName: 'Frame',
    instanceName: undefined,
    isDefinition: false,
    isTemplateInstance: false,
    templateId: undefined,
    categories: [],
    allProperties: [],
    showAllProperties: false,
    ...overrides,
  }
}

// ============================================
// MOCK FACTORIES
// ============================================

/**
 * Creates a mock PropertyExtractor
 */
export function createMockPropertyExtractor(
  initialElements: Map<string, ExtractedElement> = new Map()
): MockPropertyExtractor {
  const elements = new Map(initialElements)
  let tokens: string[] = []
  const tokenValues = new Map<string, string>()

  const mock: MockPropertyExtractor = {
    _elements: elements,
    _tokens: tokens,

    getProperties: vi.fn((nodeId: string) => elements.get(nodeId) || null),

    getPropertiesForComponentDefinition: vi.fn(() => null),

    updateAST: vi.fn(),

    updateSourceMap: vi.fn(),

    getAllElements: vi.fn(() => Array.from(elements.values())),

    _setElement(nodeId: string, element: ExtractedElement) {
      elements.set(nodeId, element)
    },

    _setTokens(newTokens: string[]) {
      tokens = newTokens
      mock._tokens = tokens
    },

    _resolveToken(token: string, suffix: string) {
      return tokenValues.get(`${token}.${suffix}`)
    },
  }

  return mock
}

/**
 * Creates a mock CodeModifier
 */
export function createMockCodeModifier(initialSource = ''): MockCodeModifier {
  let source = initialSource
  const updateHistory: Array<{ nodeId: string; prop: string; value: string }> = []
  let lastUpdate: { nodeId: string; prop: string; value: string } | null = null

  const createSuccessResult = (newSource: string): ModificationResult => ({
    success: true,
    newSource,
    change: { from: 0, to: source.length, insert: newSource },
  })

  const mock: MockCodeModifier = {
    _lastUpdate: lastUpdate,
    _source: source,
    _updateHistory: updateHistory,

    updateProperty: vi.fn((nodeId: string, prop: string, value: string) => {
      lastUpdate = { nodeId, prop, value }
      mock._lastUpdate = lastUpdate
      updateHistory.push({ nodeId, prop, value })
      const newSource = source.replace(
        new RegExp(`${prop}\\s+[^,\\n]+`),
        `${prop} ${value}`
      )
      source = newSource
      mock._source = source
      return createSuccessResult(newSource)
    }),

    addProperty: vi.fn((nodeId: string, prop: string, value: string) => {
      updateHistory.push({ nodeId, prop, value })
      const newSource = `${source}, ${prop} ${value}`
      source = newSource
      mock._source = source
      return createSuccessResult(newSource)
    }),

    removeProperty: vi.fn((nodeId: string, prop: string) => {
      const newSource = source.replace(new RegExp(`,?\\s*${prop}\\s+[^,\\n]+`), '')
      source = newSource
      mock._source = source
      return createSuccessResult(newSource)
    }),

    updateSource: vi.fn((newSource: string) => {
      source = newSource
      mock._source = source
    }),

    updateSourceMap: vi.fn(),

    getSource: vi.fn(() => source),
  }

  return mock
}

/**
 * Creates a mock SelectionProvider
 */
export function createMockSelectionProvider(): MockSelectionProvider {
  const listeners = new Set<(nodeId: string | null, prev: string | null) => void>()
  const breadcrumbListeners = new Set<(chain: BreadcrumbItem[]) => void>()
  let selection: string | null = null

  const mock: MockSelectionProvider = {
    _listeners: listeners,
    _breadcrumbListeners: breadcrumbListeners,
    _selection: selection,

    subscribe: vi.fn((listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }),

    subscribeBreadcrumb: vi.fn((listener) => {
      breadcrumbListeners.add(listener)
      return () => breadcrumbListeners.delete(listener)
    }),

    getSelection: vi.fn(() => selection),

    clearSelection: vi.fn(() => {
      mock._triggerSelection(null)
    }),

    select: vi.fn((nodeId: string | null) => {
      mock._triggerSelection(nodeId)
    }),

    _triggerSelection(nodeId: string | null) {
      const prev = selection
      selection = nodeId
      mock._selection = nodeId
      listeners.forEach((l) => l(nodeId, prev))
    },

    _triggerBreadcrumb(chain: BreadcrumbItem[]) {
      breadcrumbListeners.forEach((l) => l(chain))
    },
  }

  return mock
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

/**
 * Creates a standard element with common properties
 */
export function createStandardFrameElement(nodeId = 'node-1'): ExtractedElement {
  return createSampleElement({
    nodeId,
    componentName: 'Frame',
    allProperties: [
      createSampleProperty({ name: 'bg', value: '#1a1a1a', type: 'color' }),
      createSampleProperty({ name: 'pad', value: '16', type: 'spacing' }),
      createSampleProperty({ name: 'rad', value: '8', type: 'number' }),
      createSampleProperty({ name: 'gap', value: '12', type: 'spacing' }),
    ],
    categories: [
      createSampleCategory({
        name: 'colors',
        label: 'Colors',
        properties: [
          createSampleProperty({ name: 'bg', value: '#1a1a1a', type: 'color' }),
        ],
      }),
      createSampleCategory({
        name: 'spacing',
        label: 'Spacing',
        properties: [
          createSampleProperty({ name: 'pad', value: '16', type: 'spacing' }),
          createSampleProperty({ name: 'gap', value: '12', type: 'spacing' }),
        ],
      }),
      createSampleCategory({
        name: 'border',
        label: 'Border',
        properties: [
          createSampleProperty({ name: 'rad', value: '8', type: 'number' }),
        ],
      }),
    ],
  })
}

/**
 * Creates an element with token references
 */
export function createElementWithTokens(nodeId = 'node-1'): ExtractedElement {
  return createSampleElement({
    nodeId,
    componentName: 'Frame',
    allProperties: [
      createSampleProperty({
        name: 'bg',
        value: '$primary',
        type: 'color',
        isToken: true,
        tokenName: '$primary',
      }),
      createSampleProperty({
        name: 'pad',
        value: '$spacing.md',
        type: 'spacing',
        isToken: true,
        tokenName: '$spacing.md',
      }),
    ],
    categories: [
      createSampleCategory({
        name: 'colors',
        label: 'Colors',
        properties: [
          createSampleProperty({
            name: 'bg',
            value: '$primary',
            type: 'color',
            isToken: true,
            tokenName: '$primary',
          }),
        ],
      }),
    ],
  })
}

/**
 * Creates a component definition element
 */
export function createComponentDefinitionElement(
  componentName = 'MyButton',
  nodeId = 'def-1'
): ExtractedElement {
  return createSampleElement({
    nodeId,
    componentName,
    isDefinition: true,
    allProperties: [
      createSampleProperty({ name: 'bg', value: '#2563eb', type: 'color', source: 'component' }),
      createSampleProperty({ name: 'col', value: 'white', type: 'color', source: 'component' }),
      createSampleProperty({ name: 'pad', value: '12 24', type: 'spacing', source: 'component' }),
    ],
    categories: [
      createSampleCategory({
        name: 'colors',
        label: 'Colors',
        properties: [
          createSampleProperty({ name: 'bg', value: '#2563eb', type: 'color', source: 'component' }),
          createSampleProperty({ name: 'col', value: 'white', type: 'color', source: 'component' }),
        ],
      }),
    ],
  })
}

/**
 * Creates an instance with inherited properties
 */
export function createInstanceWithInheritance(nodeId = 'node-1'): ExtractedElement {
  return createSampleElement({
    nodeId,
    componentName: 'MyButton',
    allProperties: [
      // Inherited from component
      createSampleProperty({ name: 'bg', value: '#2563eb', type: 'color', source: 'component' }),
      createSampleProperty({ name: 'col', value: 'white', type: 'color', source: 'component' }),
      // Overridden on instance
      createSampleProperty({ name: 'pad', value: '16 32', type: 'spacing', source: 'instance' }),
    ],
    categories: [
      createSampleCategory({
        name: 'colors',
        label: 'Colors',
        properties: [
          createSampleProperty({ name: 'bg', value: '#2563eb', type: 'color', source: 'component' }),
          createSampleProperty({ name: 'col', value: 'white', type: 'color', source: 'component' }),
        ],
      }),
      createSampleCategory({
        name: 'spacing',
        label: 'Spacing',
        properties: [
          createSampleProperty({ name: 'pad', value: '16 32', type: 'spacing', source: 'instance' }),
        ],
      }),
    ],
  })
}
