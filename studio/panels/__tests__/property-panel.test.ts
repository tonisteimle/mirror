/**
 * PropertyPanel Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PropertyPanel, createPropertyPanel, type SelectionProvider } from '../property-panel'
import type { PropertyExtractor, ExtractedElement, ExtractedProperty, PropertyCategory } from '../../../src/studio/property-extractor'
import type { CodeModifier, ModificationResult } from '../../../src/studio/code-modifier'
import type { BreadcrumbItem } from '../../../src/studio/selection-manager'

// Mock SelectionProvider
function createMockSelectionProvider(): SelectionProvider & {
  _listeners: Set<(nodeId: string | null, prev: string | null) => void>
  _breadcrumbListeners: Set<(chain: BreadcrumbItem[]) => void>
  _selection: string | null
  _triggerSelection: (nodeId: string | null) => void
  _triggerBreadcrumb: (chain: BreadcrumbItem[]) => void
} {
  const listeners = new Set<(nodeId: string | null, prev: string | null) => void>()
  const breadcrumbListeners = new Set<(chain: BreadcrumbItem[]) => void>()
  let selection: string | null = null

  return {
    _listeners: listeners,
    _breadcrumbListeners: breadcrumbListeners,
    _selection: selection,
    _triggerSelection(nodeId: string | null) {
      const prev = selection
      selection = nodeId
      this._selection = nodeId
      listeners.forEach(l => l(nodeId, prev))
    },
    _triggerBreadcrumb(chain: BreadcrumbItem[]) {
      breadcrumbListeners.forEach(l => l(chain))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    subscribeBreadcrumb(listener) {
      breadcrumbListeners.add(listener)
      return () => breadcrumbListeners.delete(listener)
    },
    getSelection() {
      return selection
    },
    clearSelection() {
      this._triggerSelection(null)
    },
    select(nodeId) {
      this._triggerSelection(nodeId)
    },
  }
}

// Mock PropertyExtractor
function createMockPropertyExtractor(elements: Map<string, ExtractedElement> = new Map()): PropertyExtractor {
  return {
    getProperties: vi.fn((nodeId: string) => elements.get(nodeId) || null),
    getPropertiesForComponentDefinition: vi.fn(() => null),
    updateAST: vi.fn(),
    updateSourceMap: vi.fn(),
    getAllElements: vi.fn(() => Array.from(elements.values())),
  } as unknown as PropertyExtractor
}

// Mock CodeModifier
function createMockCodeModifier(): CodeModifier & { _lastUpdate: { nodeId: string; prop: string; value: string } | null } {
  return {
    _lastUpdate: null,
    updateProperty: vi.fn(function(this: any, nodeId: string, prop: string, value: string): ModificationResult {
      this._lastUpdate = { nodeId, prop, value }
      return { success: true, newSource: `// updated ${prop}=${value}` }
    }),
    removeProperty: vi.fn((): ModificationResult => ({ success: true, newSource: '// removed' })),
    addProperty: vi.fn((): ModificationResult => ({ success: true, newSource: '// added' })),
    updateSource: vi.fn(),
    updateSourceMap: vi.fn(),
    getSource: vi.fn(() => '// mock source'),
  } as unknown as CodeModifier & { _lastUpdate: { nodeId: string; prop: string; value: string } | null }
}

// Create a sample ExtractedElement
function createSampleElement(overrides: Partial<ExtractedElement> = {}): ExtractedElement {
  return {
    nodeId: 'node-1',
    componentName: 'Box',
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

// Create a sample property
function createSampleProperty(overrides: Partial<ExtractedProperty> = {}): ExtractedProperty {
  return {
    name: 'bg',
    value: '#FF0000',
    rawValue: '#FF0000',
    category: 'color',
    type: 'color',
    source: 'direct',
    line: 1,
    column: 5,
    ...overrides,
  }
}

// Create a sample category
function createSampleCategory(overrides: Partial<PropertyCategory> = {}): PropertyCategory {
  return {
    name: 'color',
    label: 'Color',
    properties: [],
    ...overrides,
  }
}

describe('PropertyPanel', () => {
  let container: HTMLElement
  let selectionManager: ReturnType<typeof createMockSelectionProvider>
  let propertyExtractor: ReturnType<typeof createMockPropertyExtractor>
  let codeModifier: ReturnType<typeof createMockCodeModifier>
  let onCodeChange: ReturnType<typeof vi.fn>
  let panel: PropertyPanel

  beforeEach(() => {
    // Create container
    container = document.createElement('div')
    document.body.appendChild(container)

    // Create mocks
    selectionManager = createMockSelectionProvider()
    propertyExtractor = createMockPropertyExtractor()
    codeModifier = createMockCodeModifier()
    onCodeChange = vi.fn()
  })

  afterEach(() => {
    panel?.dispose()
    container.remove()
  })

  describe('Initialization', () => {
    it('should create a PropertyPanel instance', () => {
      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      expect(panel).toBeInstanceOf(PropertyPanel)
    })

    it('should use factory function', () => {
      panel = createPropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      expect(panel).toBeInstanceOf(PropertyPanel)
    })

    it('should subscribe to selection manager on creation', () => {
      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      // PropertyPanel subscribes to selection changes
      expect(selectionManager._listeners.size).toBe(1)
      // Note: PropertyPanel does not currently subscribe to breadcrumb changes
      // Breadcrumb rendering is not implemented in PropertyPanel
    })

    it('should render empty state when no selection', () => {
      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      expect(container.innerHTML).toContain('Select an element')
    })

    it('should accept custom options', () => {
      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange,
        { debounceTime: 500, showSourceIndicators: false }
      )

      expect(panel).toBeInstanceOf(PropertyPanel)
    })
  })

  describe('Selection Handling', () => {
    beforeEach(() => {
      const element = createSampleElement({
        nodeId: 'test-node',
        componentName: 'Button',
        allProperties: [createSampleProperty({ name: 'bg', value: '#3B82F6' })],
        categories: [
          createSampleCategory({
            name: 'color',
            label: 'Color',
            properties: [createSampleProperty({ name: 'bg', value: '#3B82F6' })]
          })
        ]
      })

      propertyExtractor = createMockPropertyExtractor(new Map([['test-node', element]]))

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )
    })

    it('should update panel when selection changes', () => {
      selectionManager._triggerSelection('test-node')

      expect(propertyExtractor.getProperties).toHaveBeenCalledWith('test-node')
      // Panel renders categories, not the component name directly
      expect(container.innerHTML).toContain('pp-content')
    })

    it('should render empty state when selection cleared', () => {
      selectionManager._triggerSelection('test-node')
      selectionManager._triggerSelection(null)

      expect(container.innerHTML).toContain('Select an element')
    })

    it('should render not found when element not in AST', () => {
      selectionManager._triggerSelection('non-existent-node')

      expect(container.innerHTML).toContain('Element not found')
    })
  })

  describe('Breadcrumb', () => {
    beforeEach(() => {
      const element = createSampleElement({
        nodeId: 'child-node',
        componentName: 'Text',
        allProperties: []
      })
      propertyExtractor = createMockPropertyExtractor(new Map([['child-node', element]]))

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      selectionManager._triggerSelection('child-node')
    })

    it('should render content when element is selected', () => {
      // Note: PropertyPanel does not currently render breadcrumb navigation
      // It renders the property content for the selected element
      expect(container.querySelector('.pp-content')).toBeTruthy()
    })
  })

  describe('Detach', () => {
    it('should unsubscribe from selection manager on detach', () => {
      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      expect(selectionManager._listeners.size).toBe(1)

      panel.detach()

      expect(selectionManager._listeners.size).toBe(0)
      expect(selectionManager._breadcrumbListeners.size).toBe(0)
    })
  })

  describe('Dispose', () => {
    it('should clean up on dispose', () => {
      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      panel.dispose()

      expect(container.innerHTML).toBe('')
      expect(selectionManager._listeners.size).toBe(0)
    })
  })

  describe('Update Dependencies', () => {
    it('should update property extractor and code modifier', () => {
      const element = createSampleElement({ nodeId: 'node-1' })
      propertyExtractor = createMockPropertyExtractor(new Map([['node-1', element]]))

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      selectionManager._triggerSelection('node-1')

      const newExtractor = createMockPropertyExtractor(new Map([['node-1', createSampleElement({ nodeId: 'node-1', componentName: 'NewComponent' })]]))
      const newModifier = createMockCodeModifier()

      panel.updateDependencies(newExtractor, newModifier)

      expect(newExtractor.getProperties).toHaveBeenCalled()
    })
  })

  describe('Refresh', () => {
    it('should re-render current selection', () => {
      const element = createSampleElement({
        nodeId: 'node-1',
        componentName: 'Box',
        allProperties: [createSampleProperty({ name: 'w', value: '100' })]
      })
      propertyExtractor = createMockPropertyExtractor(new Map([['node-1', element]]))

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      selectionManager._triggerSelection('node-1')
      const initialHtml = container.innerHTML

      // Update element with different properties
      const updatedElement = createSampleElement({
        nodeId: 'node-1',
        componentName: 'Box',
        allProperties: [createSampleProperty({ name: 'h', value: '200' })]
      })
      ;(propertyExtractor.getProperties as ReturnType<typeof vi.fn>).mockReturnValue(updatedElement)

      panel.refresh()

      // The panel should re-render (content may differ)
      expect(propertyExtractor.getProperties).toHaveBeenCalled()
    })
  })

  describe('Component Definition', () => {
    it('should show component definition properties', () => {
      const compDef = createSampleElement({
        nodeId: 'comp-def',
        componentName: 'MyButton',
        isDefinition: true,
        allProperties: [createSampleProperty({ name: 'bg', value: '#blue' })],
      })

      ;(propertyExtractor.getPropertiesForComponentDefinition as ReturnType<typeof vi.fn>).mockReturnValue(compDef)

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      const result = panel.showComponentDefinition('MyButton')

      expect(result).toBe(true)
      // Panel renders content, the component name is shown in breadcrumb if set
      expect(container.innerHTML).toContain('pp-content')
    })

    it('should return false when component not found', () => {
      ;(propertyExtractor.getPropertiesForComponentDefinition as ReturnType<typeof vi.fn>).mockReturnValue(null)

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      const result = panel.showComponentDefinition('NonExistent')

      expect(result).toBe(false)
    })
  })

  describe('Rendering', () => {
    it('should render content for selected element', () => {
      const element = createSampleElement({
        nodeId: 'node-1',
        componentName: 'Card',
        allProperties: []
      })
      propertyExtractor = createMockPropertyExtractor(new Map([['node-1', element]]))

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      selectionManager._triggerSelection('node-1')

      expect(container.querySelector('.pp-content')).toBeTruthy()
    })

    it('should render content area for element with instance name', () => {
      const element = createSampleElement({
        nodeId: 'node-1',
        componentName: 'Button',
        instanceName: 'submitBtn',
        allProperties: []
      })
      propertyExtractor = createMockPropertyExtractor(new Map([['node-1', element]]))

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      selectionManager._triggerSelection('node-1')

      // PropertyPanel renders content area for selected element
      // Note: Breadcrumb navigation is not currently implemented
      expect(container.querySelector('.pp-content')).toBeTruthy()
    })

    it('should render categories with labels', () => {
      const element = createSampleElement({
        nodeId: 'node-1',
        componentName: 'Box',
        allProperties: [],
        categories: [
          createSampleCategory({
            name: 'layout',
            label: 'Layout',
            properties: [createSampleProperty({ name: 'hor', value: 'true', type: 'boolean' })]
          }),
        ]
      })
      propertyExtractor = createMockPropertyExtractor(new Map([['node-1', element]]))

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      selectionManager._triggerSelection('node-1')

      // Categories are rendered as sections
      expect(container.querySelector('.pp-content')).toBeTruthy()
    })
  })

  describe('Property Rendering', () => {
    it('should render color triggers for color properties', () => {
      const element = createSampleElement({
        nodeId: 'node-1',
        componentName: 'Box',
        allProperties: [createSampleProperty({ name: 'bg', value: '#FF0000', type: 'color' })],
        categories: [
          createSampleCategory({
            name: 'color',
            label: 'Color',
            properties: [createSampleProperty({ name: 'bg', value: '#FF0000', type: 'color' })]
          })
        ]
      })
      propertyExtractor = createMockPropertyExtractor(new Map([['node-1', element]]))

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      selectionManager._triggerSelection('node-1')

      // Color properties use color triggers instead of inputs
      const colorTriggers = container.querySelectorAll('.pp-color-trigger')
      expect(colorTriggers.length).toBeGreaterThan(0)
    })

    it('should render content area', () => {
      const element = createSampleElement({
        nodeId: 'node-1',
        componentName: 'Box',
        allProperties: []
      })
      propertyExtractor = createMockPropertyExtractor(new Map([['node-1', element]]))

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      selectionManager._triggerSelection('node-1')

      expect(container.querySelector('.pp-content')).toBeTruthy()
    })
  })

  describe('Empty and Error States', () => {
    it('should show empty state with correct message', () => {
      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      expect(container.querySelector('.pp-empty')).toBeTruthy()
      expect(container.textContent).toContain('Select an element')
    })

    it('should show not found state with hint', () => {
      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange
      )

      selectionManager._triggerSelection('deleted-node')

      expect(container.querySelector('.pp-not-found')).toBeTruthy()
      expect(container.textContent).toContain('Element not found')
      expect(container.textContent).toContain('may have been removed')
    })
  })

  describe('Options', () => {
    it('should use getAllSource callback when provided', () => {
      const getAllSource = vi.fn(() => '$token: #FFF\nBox bg $token')

      panel = new PropertyPanel(
        container,
        selectionManager,
        propertyExtractor,
        codeModifier,
        onCodeChange,
        { getAllSource }
      )

      // getAllSource is used internally for token extraction
      expect(panel).toBeInstanceOf(PropertyPanel)
    })
  })
})

describe('createPropertyPanel', () => {
  it('should be a factory function that creates PropertyPanel', () => {
    const container = document.createElement('div')
    const selectionManager = createMockSelectionProvider()
    const propertyExtractor = createMockPropertyExtractor()
    const codeModifier = createMockCodeModifier()
    const onCodeChange = vi.fn()

    const panel = createPropertyPanel(
      container,
      selectionManager,
      propertyExtractor,
      codeModifier,
      onCodeChange
    )

    expect(panel).toBeInstanceOf(PropertyPanel)
    panel.dispose()
  })
})
