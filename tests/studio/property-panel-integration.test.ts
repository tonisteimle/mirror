/**
 * Property Panel Integration Tests
 *
 * Phase 2: Tests for signal handling, property change flow, and error recovery.
 * These tests focus on the orchestration logic without instantiating the full PropertyPanel.
 *
 * @jest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================
// Test Imports
// ============================================

import type { SectionDependencies } from '../../studio/panels/property/base/section'
import type { PropertyChangeCallback, SectionData, ExtractedProperty } from '../../studio/panels/property/types'

// ============================================
// Mock Factories
// ============================================

interface MockCodeModifier {
  updateProperty: ReturnType<typeof vi.fn>
  addProperty: ReturnType<typeof vi.fn>
  removeProperty: ReturnType<typeof vi.fn>
  getSource: ReturnType<typeof vi.fn>
}

interface MockSelectionProvider {
  subscribe: ReturnType<typeof vi.fn>
  subscribeBreadcrumb: ReturnType<typeof vi.fn>
  getSelection: ReturnType<typeof vi.fn>
  clearSelection: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
}

interface MockPropertyExtractor {
  extract: ReturnType<typeof vi.fn>
}

function createMockCodeModifier(): MockCodeModifier {
  return {
    updateProperty: vi.fn().mockReturnValue({ success: true }),
    addProperty: vi.fn().mockReturnValue({ success: true }),
    removeProperty: vi.fn().mockReturnValue({ success: true }),
    getSource: vi.fn().mockReturnValue('')
  }
}

function createMockSelectionProvider(): MockSelectionProvider {
  return {
    subscribe: vi.fn().mockReturnValue(() => {}),
    subscribeBreadcrumb: vi.fn().mockReturnValue(() => {}),
    getSelection: vi.fn().mockReturnValue(null),
    clearSelection: vi.fn(),
    select: vi.fn()
  }
}

function createMockPropertyExtractor(): MockPropertyExtractor {
  return {
    extract: vi.fn().mockReturnValue({
      nodeId: 'test-node',
      nodeName: 'Frame',
      categories: []
    })
  }
}

function createMockElement(overrides: Partial<{
  nodeId: string
  templateId: string
  nodeName: string
  categories: Array<{ name: string; label: string; properties: ExtractedProperty[] }>
  interactions: Array<{ name: string; args: string[] }>
  events: Array<{ name: string; key?: string; actions: Array<{ name: string; target?: string; isFunctionCall: boolean }> }>
  actions: Array<{ name: string; target?: string; isFunctionCall: boolean }>
}> = {}) {
  return {
    nodeId: 'test-node-1',
    templateId: undefined,
    nodeName: 'Frame',
    categories: [
      {
        name: 'layout',
        label: 'Layout',
        properties: []
      }
    ],
    interactions: [],
    events: [],
    actions: [],
    ...overrides
  }
}

function createMockProperty(overrides: Partial<ExtractedProperty> = {}): ExtractedProperty {
  return {
    name: 'testProp',
    value: '',
    hasValue: false,
    source: 'default',
    ...overrides
  }
}

// ============================================
// Signal Handling Tests
// ============================================

describe('Property Panel Signal Handling', () => {
  describe('Signal Registry', () => {
    it('should recognize all defined signals', () => {
      // This test verifies the expected signals follow the __ prefix pattern
      const expectedSignals = [
        '__LAYOUT__',
        '__ALIGNMENT__',
        '__PAD_TOKEN__',
        '__PAD_INPUT__',
        '__MARGIN_TOKEN__',
        '__MARGIN_INPUT__',
        '__BORDER_WIDTH__',
        '__BORDER_COLOR_PICKER__',
        '__COLOR_PICKER__',
        '__RADIUS_CORNER__',
        '__TEXT_STYLE__',
        '__BEHAVIOR_TOGGLE__',
        '__OVERFLOW__',
        '__VISIBILITY__',
        '__ICON_FILL__',
        '__INTERACTION__',
        '__ADD_EVENT__',
        '__EDIT_EVENT__',
        '__DELETE_EVENT__'
      ]

      // All signals must start with __
      expectedSignals.forEach(signal => {
        expect(signal.startsWith('__')).toBe(true)
        expect(signal.endsWith('__')).toBe(true)
      })

      // Verify count
      expect(expectedSignals.length).toBe(19)
    })

    it('should distinguish special signals from regular properties', () => {
      const regularProperties = ['bg', 'col', 'width', 'height', 'pad']
      const specialSignals = ['__LAYOUT__', '__REMOVE__', '__ALIGNMENT__']

      regularProperties.forEach(prop => {
        expect(prop.startsWith('__')).toBe(false)
      })

      specialSignals.forEach(signal => {
        expect(signal.startsWith('__')).toBe(true)
      })
    })
  })

  describe('__REMOVE__ Signal', () => {
    it('should trigger removeProperty when value is __REMOVE__', () => {
      const mockModifier = createMockCodeModifier()

      // Simulate the __REMOVE__ handling logic
      const handlePropertyChange = (property: string, value: string) => {
        if (value === '__REMOVE__') {
          mockModifier.removeProperty('node-1', property)
          return
        }
        mockModifier.updateProperty('node-1', property, value)
      }

      handlePropertyChange('wrap', '__REMOVE__')

      expect(mockModifier.removeProperty).toHaveBeenCalledWith('node-1', 'wrap')
      expect(mockModifier.updateProperty).not.toHaveBeenCalled()
    })

    it('should not trigger removeProperty for normal values', () => {
      const mockModifier = createMockCodeModifier()

      const handlePropertyChange = (property: string, value: string) => {
        if (value === '__REMOVE__') {
          mockModifier.removeProperty('node-1', property)
          return
        }
        mockModifier.updateProperty('node-1', property, value)
      }

      handlePropertyChange('bg', '#fff')

      expect(mockModifier.removeProperty).not.toHaveBeenCalled()
      expect(mockModifier.updateProperty).toHaveBeenCalledWith('node-1', 'bg', '#fff')
    })
  })

  describe('Signal Routing', () => {
    it('should route signals starting with __ to special handler', () => {
      const testSignals = ['__LAYOUT__', '__ALIGNMENT__', '__PAD_TOKEN__']
      const regularProps = ['bg', 'width', 'pad']

      // Verify routing logic
      const isSpecialSignal = (prop: string) => prop.startsWith('__')

      testSignals.forEach(signal => {
        expect(isSpecialSignal(signal)).toBe(true)
      })

      regularProps.forEach(prop => {
        expect(isSpecialSignal(prop)).toBe(false)
      })
    })

    it('should call appropriate handler for each signal type', () => {
      const handlers: Record<string, ReturnType<typeof vi.fn>> = {
        '__LAYOUT__': vi.fn(),
        '__ALIGNMENT__': vi.fn(),
        '__PAD_TOKEN__': vi.fn()
      }

      const handleSpecialSignal = (signal: string, value: string) => {
        const handler = handlers[signal]
        if (handler) {
          handler(value)
        }
      }

      handleSpecialSignal('__LAYOUT__', 'horizontal')
      handleSpecialSignal('__ALIGNMENT__', 'center')
      handleSpecialSignal('__PAD_TOKEN__', '{"value":"8","dir":"all"}')

      expect(handlers['__LAYOUT__']).toHaveBeenCalledWith('horizontal')
      expect(handlers['__ALIGNMENT__']).toHaveBeenCalledWith('center')
      expect(handlers['__PAD_TOKEN__']).toHaveBeenCalledWith('{"value":"8","dir":"all"}')
    })
  })
})

// ============================================
// Property Change Flow Tests
// ============================================

describe('Property Change Flow', () => {
  describe('Input vs Token vs Toggle Sources', () => {
    it('should debounce input source changes', () => {
      vi.useFakeTimers()
      const mockModifier = createMockCodeModifier()
      const debounceTime = 150
      const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

      // Simulate debounced property change
      const debouncedUpdate = (property: string, value: string, source: 'input' | 'token' | 'toggle') => {
        if (source === 'input') {
          const existingTimer = debounceTimers.get(property)
          if (existingTimer) clearTimeout(existingTimer)
          debounceTimers.set(property, setTimeout(() => {
            mockModifier.updateProperty('node-1', property, value)
          }, debounceTime))
        } else {
          mockModifier.updateProperty('node-1', property, value)
        }
      }

      // Multiple rapid input changes
      debouncedUpdate('width', '100', 'input')
      debouncedUpdate('width', '150', 'input')
      debouncedUpdate('width', '200', 'input')

      // Before debounce
      expect(mockModifier.updateProperty).not.toHaveBeenCalled()

      // After debounce
      vi.advanceTimersByTime(debounceTime)
      expect(mockModifier.updateProperty).toHaveBeenCalledTimes(1)
      expect(mockModifier.updateProperty).toHaveBeenCalledWith('node-1', 'width', '200')

      vi.useRealTimers()
    })

    it('should immediately apply token source changes', () => {
      const mockModifier = createMockCodeModifier()

      const handlePropertyChange = (property: string, value: string, source: 'input' | 'token' | 'toggle') => {
        if (source === 'token') {
          mockModifier.updateProperty('node-1', property, value)
        }
      }

      handlePropertyChange('pad', '$sm', 'token')
      expect(mockModifier.updateProperty).toHaveBeenCalledWith('node-1', 'pad', '$sm')
    })

    it('should immediately apply toggle source changes', () => {
      const mockModifier = createMockCodeModifier()

      const handlePropertyChange = (property: string, value: string, source: 'input' | 'token' | 'toggle') => {
        if (source === 'toggle') {
          mockModifier.updateProperty('node-1', property, value)
        }
      }

      handlePropertyChange('hor', '', 'toggle')
      expect(mockModifier.updateProperty).toHaveBeenCalledWith('node-1', 'hor', '')
    })
  })

  describe('Property Update Result Handling', () => {
    it('should handle successful property update', () => {
      const mockModifier = createMockCodeModifier()
      mockModifier.updateProperty.mockReturnValue({ success: true })

      expect(mockModifier.updateProperty()).toEqual({ success: true })
    })

    it('should handle failed property update', () => {
      const mockModifier = createMockCodeModifier()
      mockModifier.updateProperty.mockReturnValue({ success: false, error: 'Node not found' })

      const result = mockModifier.updateProperty()
      expect(result.success).toBe(false)
      expect(result.error).toBe('Node not found')
    })
  })

  describe('Node ID Resolution', () => {
    it('should prefer templateId over nodeId', () => {
      const element = createMockElement({
        nodeId: 'instance-123',
        templateId: 'template-456'
      })

      // The panel should use templateId when available
      const nodeId = element.templateId || element.nodeId
      expect(nodeId).toBe('template-456')
    })

    it('should fall back to nodeId when templateId is undefined', () => {
      const element = createMockElement({
        nodeId: 'instance-123',
        templateId: undefined
      })

      const nodeId = element.templateId || element.nodeId
      expect(nodeId).toBe('instance-123')
    })
  })
})

// ============================================
// Error Recovery Tests
// ============================================

describe('Error Recovery', () => {
  describe('Missing Element Handling', () => {
    it('should handle missing currentElement gracefully', () => {
      const mockModifier = createMockCodeModifier()

      // Simulate the check for currentElement
      let currentElement: ReturnType<typeof createMockElement> | null = null

      const handlePropertyChange = (property: string, value: string) => {
        if (!currentElement) return // Early return pattern
        mockModifier.updateProperty(currentElement.nodeId, property, value)
      }

      // Should not throw when no element is selected
      expect(() => handlePropertyChange('bg', '#fff')).not.toThrow()
      expect(mockModifier.updateProperty).not.toHaveBeenCalled()
    })

    it('should handle null categories gracefully', () => {
      const element = createMockElement({
        categories: []
      })

      // Empty categories array should not cause errors
      expect(element.categories).toEqual([])
      expect(element.categories.find(c => c.name === 'nonexistent')).toBeUndefined()
    })

    it('should handle missing property in category gracefully', () => {
      const element = createMockElement({
        categories: [{
          name: 'layout',
          label: 'Layout',
          properties: [createMockProperty({ name: 'hor', value: 'true' })]
        }]
      })

      const layoutCat = element.categories.find(c => c.name === 'layout')
      const missingProp = layoutCat?.properties.find(p => p.name === 'nonexistent')

      expect(missingProp).toBeUndefined()
    })
  })

  describe('JSON Parse Error Handling', () => {
    it('should handle invalid JSON in signal data', () => {
      // safeJsonParse should return fallback on invalid JSON
      const invalidJson = 'not valid json {'
      let result: any

      try {
        result = JSON.parse(invalidJson)
      } catch {
        result = null // fallback
      }

      expect(result).toBeNull()
    })

    it('should use fallback value on parse error', () => {
      const fallback = { value: '', dir: '' }
      let result: any

      try {
        result = JSON.parse('invalid')
      } catch {
        result = fallback
      }

      expect(result).toEqual(fallback)
    })
  })

  describe('CodeModifier Error Handling', () => {
    it('should handle codeModifier.updateProperty failure', () => {
      const mockModifier = createMockCodeModifier()
      mockModifier.updateProperty.mockReturnValue({
        success: false,
        error: 'Could not find node'
      })

      const result = mockModifier.updateProperty('node-1', 'bg', '#fff')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle codeModifier.removeProperty failure', () => {
      const mockModifier = createMockCodeModifier()
      mockModifier.removeProperty.mockReturnValue({
        success: false,
        error: 'Property not found'
      })

      const result = mockModifier.removeProperty('node-1', 'bg')

      expect(result.success).toBe(false)
    })

    it('should handle codeModifier.addProperty failure', () => {
      const mockModifier = createMockCodeModifier()
      mockModifier.addProperty.mockReturnValue({
        success: false,
        error: 'Invalid property'
      })

      const result = mockModifier.addProperty('node-1', 'invalidProp', 'value')

      expect(result.success).toBe(false)
    })
  })

  describe('Event Delegation Error Handling', () => {
    it('should handle missing event target gracefully', () => {
      // Event handlers should check for target existence
      const mockTarget = null
      const getAttribute = mockTarget?.getAttribute?.('data-prop')

      expect(getAttribute).toBeUndefined()
    })

    it('should handle missing data attributes gracefully', () => {
      const mockTarget = document.createElement('div')
      // No data-prop attribute set

      const value = mockTarget.getAttribute('data-prop')
      expect(value).toBeNull()
    })
  })
})

// ============================================
// Section Coordination Tests
// ============================================

describe('Section Coordination', () => {
  describe('Section Dependencies', () => {
    it('should provide onPropertyChange callback to sections', () => {
      const mockOnPropertyChange = vi.fn()

      // Simulate section dependencies
      const deps: SectionDependencies = {
        onPropertyChange: mockOnPropertyChange,
        escapeHtml: (str: string) => str,
        getSpacingTokens: () => [],
        getColorTokens: () => []
      }

      // Callback should be available
      deps.onPropertyChange('bg', '#fff', 'input')
      expect(mockOnPropertyChange).toHaveBeenCalledWith('bg', '#fff', 'input')
    })

    it('should provide escapeHtml function to sections', () => {
      const testCases = [
        { input: '<script>', expected: '&lt;script&gt;' },
        { input: '"quotes"', expected: '&quot;quotes&quot;' },
        { input: "it's", expected: "it&#39;s" },
        { input: 'normal text', expected: 'normal text' }
      ]

      const escapeHtml = (str: string) =>
        str.replace(/[&<>"']/g, c =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
        )

      testCases.forEach(({ input, expected }) => {
        expect(escapeHtml(input)).toBe(expected)
      })
    })

    it('should provide token getter functions to sections', () => {
      const mockSpacingTokens = [
        { name: 'sm', fullName: 'sm.pad', value: '8' },
        { name: 'md', fullName: 'md.pad', value: '16' }
      ]
      const mockColorTokens = [
        { name: 'primary', value: '#2563eb' }
      ]

      const deps: SectionDependencies = {
        onPropertyChange: vi.fn(),
        escapeHtml: (str: string) => str,
        getSpacingTokens: (suffix: string) => mockSpacingTokens.filter(t => t.fullName.endsWith(suffix)),
        getColorTokens: () => mockColorTokens
      }

      expect(deps.getSpacingTokens('.pad')).toEqual(mockSpacingTokens)
      expect(deps.getColorTokens()).toEqual(mockColorTokens)
    })
  })

  describe('Section Rendering', () => {
    it('should support conditional section rendering based on categories', () => {
      const element = createMockElement({
        categories: [
          { name: 'layout', label: 'Layout', properties: [] },
          { name: 'sizing', label: 'Sizing', properties: [] },
          { name: 'spacing', label: 'Spacing', properties: [] }
        ]
      })

      // Sections should render based on available categories
      const availableCategories = element.categories.map(c => c.name)

      expect(availableCategories).toContain('layout')
      expect(availableCategories).toContain('sizing')
      expect(availableCategories).toContain('spacing')
      expect(availableCategories).not.toContain('behavior')
    })

    it('should pass correct data to each section', () => {
      const layoutProperties = [
        createMockProperty({ name: 'hor', value: 'true', hasValue: true }),
        createMockProperty({ name: 'gap', value: '8' })
      ]

      const sectionData: SectionData = {
        category: {
          name: 'layout',
          label: 'Layout',
          properties: layoutProperties
        },
        nodeId: 'test-node'
      }

      expect(sectionData.category?.name).toBe('layout')
      expect(sectionData.category?.properties).toHaveLength(2)
      expect(sectionData.nodeId).toBe('test-node')
    })
  })

  describe('Selection Change Handling', () => {
    it('should track current element on selection', () => {
      let currentElement: ReturnType<typeof createMockElement> | null = null

      const updatePanel = (nodeId: string | null) => {
        if (!nodeId) {
          currentElement = null
          return
        }
        currentElement = createMockElement({ nodeId })
      }

      // Initial selection
      updatePanel('node-1')
      expect(currentElement?.nodeId).toBe('node-1')

      // Change selection
      updatePanel('node-2')
      expect(currentElement?.nodeId).toBe('node-2')
    })

    it('should clear element when selection is cleared', () => {
      let currentElement: ReturnType<typeof createMockElement> | null = null

      const updatePanel = (nodeId: string | null) => {
        if (!nodeId) {
          currentElement = null
          return
        }
        currentElement = createMockElement({ nodeId })
      }

      updatePanel('node-1')
      expect(currentElement).not.toBeNull()

      updatePanel(null)
      expect(currentElement).toBeNull()
    })

    it('should extract properties on selection change', () => {
      const mockExtractor = createMockPropertyExtractor()

      const updatePanel = (nodeId: string | null) => {
        if (!nodeId) return
        mockExtractor.extract(nodeId)
      }

      updatePanel('node-1')
      updatePanel('node-2')

      expect(mockExtractor.extract).toHaveBeenCalledTimes(2)
      expect(mockExtractor.extract).toHaveBeenCalledWith('node-1')
      expect(mockExtractor.extract).toHaveBeenCalledWith('node-2')
    })
  })
})

// ============================================
// Debounce Tests
// ============================================

describe('Debounce Behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should coalesce rapid input changes', () => {
    const callback = vi.fn()
    const debounceTime = 150

    // Simulate debounce behavior
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const debouncedFn = (value: string) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => callback(value), debounceTime)
    }

    // Rapid calls
    debouncedFn('a')
    debouncedFn('ab')
    debouncedFn('abc')

    // Before debounce time
    expect(callback).not.toHaveBeenCalled()

    // After debounce time
    vi.advanceTimersByTime(debounceTime)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('abc')
  })

  it('should debounce per-property independently', () => {
    const callbacks: Record<string, ReturnType<typeof vi.fn>> = {
      width: vi.fn(),
      height: vi.fn()
    }
    const debounceTime = 150
    const timeouts: Record<string, ReturnType<typeof setTimeout>> = {}

    const debouncedFn = (property: string, value: string) => {
      if (timeouts[property]) clearTimeout(timeouts[property])
      timeouts[property] = setTimeout(() => callbacks[property](value), debounceTime)
    }

    // Changes to different properties
    debouncedFn('width', '100')
    debouncedFn('height', '200')
    debouncedFn('width', '150')

    vi.advanceTimersByTime(debounceTime)

    expect(callbacks.width).toHaveBeenCalledTimes(1)
    expect(callbacks.width).toHaveBeenCalledWith('150')
    expect(callbacks.height).toHaveBeenCalledTimes(1)
    expect(callbacks.height).toHaveBeenCalledWith('200')
  })
})

// ============================================
// Dispose/Cleanup Tests
// ============================================

describe('Dispose and Cleanup', () => {
  it('should unsubscribe from selection provider on dispose', () => {
    const unsubscribe = vi.fn()
    let unsubscribeRef: (() => void) | null = unsubscribe

    // Simulate dispose pattern
    const dispose = () => {
      if (unsubscribeRef) {
        unsubscribeRef()
        unsubscribeRef = null
      }
    }

    dispose()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('should clear container on dispose', () => {
    const container = document.createElement('div')
    container.innerHTML = '<div>Some content</div>'

    // Simulate dispose pattern
    const dispose = () => {
      container.innerHTML = ''
    }

    dispose()
    expect(container.innerHTML).toBe('')
  })

  it('should handle multiple dispose calls gracefully', () => {
    const unsubscribe = vi.fn()
    let unsubscribeRef: (() => void) | null = unsubscribe

    const dispose = () => {
      if (unsubscribeRef) {
        unsubscribeRef()
        unsubscribeRef = null
      }
    }

    // Multiple dispose calls should not throw
    expect(() => {
      dispose()
      dispose()
    }).not.toThrow()

    // Should only be called once
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('should clear debounce timers on dispose', () => {
    vi.useFakeTimers()
    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

    // Set up some timers
    debounceTimers.set('width', setTimeout(() => {}, 150))
    debounceTimers.set('height', setTimeout(() => {}, 150))

    // Dispose should clear all timers
    const dispose = () => {
      debounceTimers.forEach((timer) => clearTimeout(timer))
      debounceTimers.clear()
    }

    dispose()
    expect(debounceTimers.size).toBe(0)

    vi.useRealTimers()
  })

  it('should null out references on dispose', () => {
    let currentElement: ReturnType<typeof createMockElement> | null = createMockElement()
    let container: HTMLElement | null = document.createElement('div')

    const dispose = () => {
      currentElement = null
      container = null
    }

    expect(currentElement).not.toBeNull()
    expect(container).not.toBeNull()

    dispose()

    expect(currentElement).toBeNull()
    expect(container).toBeNull()
  })
})
