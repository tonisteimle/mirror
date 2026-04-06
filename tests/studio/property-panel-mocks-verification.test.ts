/**
 * Verification Tests for Property Panel Mocks & Helpers
 *
 * Ensures the new test utilities work correctly.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createMockPropertyExtractor,
  createMockCodeModifier,
  createMockSelectionProvider,
  createSampleProperty,
  createSampleCategory,
  createSampleElement,
  createStandardFrameElement,
  createElementWithTokens,
  createComponentDefinitionElement,
  createInstanceWithInheritance,
} from '../utils/mocks/property-panel-mocks'
import {
  createTestContainer,
  removeTestContainer,
  getPropertyInput,
  getAllPropertyFields,
  isEmptyState,
  hasContent,
  assertPropertyUpdated,
  assertNoPropertyUpdates,
} from '../utils/helpers/property-panel-helpers'

describe('Property Panel Mocks Verification', () => {
  describe('createSampleProperty', () => {
    it('should create a property with default values', () => {
      const prop = createSampleProperty()

      expect(prop.name).toBe('bg')
      expect(prop.value).toBe('#1a1a1a')
      expect(prop.type).toBe('color')
      expect(prop.source).toBe('instance')
    })

    it('should allow overriding values', () => {
      const prop = createSampleProperty({
        name: 'pad',
        value: '16',
        type: 'spacing',
      })

      expect(prop.name).toBe('pad')
      expect(prop.value).toBe('16')
      expect(prop.type).toBe('spacing')
    })
  })

  describe('createSampleElement', () => {
    it('should create an element with default values', () => {
      const element = createSampleElement()

      expect(element.nodeId).toBe('node-1')
      expect(element.componentName).toBe('Frame')
      expect(element.isDefinition).toBe(false)
      expect(element.allProperties).toEqual([])
    })

    it('should allow overriding values', () => {
      const element = createSampleElement({
        nodeId: 'node-5',
        componentName: 'Button',
        isDefinition: true,
      })

      expect(element.nodeId).toBe('node-5')
      expect(element.componentName).toBe('Button')
      expect(element.isDefinition).toBe(true)
    })
  })

  describe('Preset Elements', () => {
    it('should create a standard frame element', () => {
      const element = createStandardFrameElement('node-2')

      expect(element.nodeId).toBe('node-2')
      expect(element.componentName).toBe('Frame')
      expect(element.allProperties.length).toBeGreaterThan(0)
      expect(element.categories.length).toBeGreaterThan(0)
    })

    it('should create an element with tokens', () => {
      const element = createElementWithTokens()

      const bgProp = element.allProperties.find((p) => p.name === 'bg')
      expect(bgProp?.isToken).toBe(true)
      expect(bgProp?.tokenName).toBe('$primary')
    })

    it('should create a component definition', () => {
      const element = createComponentDefinitionElement('MyCard', 'def-5')

      expect(element.nodeId).toBe('def-5')
      expect(element.componentName).toBe('MyCard')
      expect(element.isDefinition).toBe(true)
    })

    it('should create an instance with inheritance', () => {
      const element = createInstanceWithInheritance()

      const bgProp = element.allProperties.find((p) => p.name === 'bg')
      const padProp = element.allProperties.find((p) => p.name === 'pad')

      expect(bgProp?.source).toBe('component')
      expect(padProp?.source).toBe('instance')
    })
  })

  describe('MockPropertyExtractor', () => {
    it('should return null for unknown node', () => {
      const extractor = createMockPropertyExtractor()

      expect(extractor.getProperties('unknown')).toBeNull()
    })

    it('should return element when set', () => {
      const extractor = createMockPropertyExtractor()
      const element = createStandardFrameElement()

      extractor._setElement('node-1', element)

      expect(extractor.getProperties('node-1')).toBe(element)
      expect(extractor.getProperties).toHaveBeenCalledWith('node-1')
    })

    it('should support initial elements', () => {
      const element = createSampleElement({ nodeId: 'test-node' })
      const extractor = createMockPropertyExtractor(new Map([['test-node', element]]))

      expect(extractor.getProperties('test-node')).toBe(element)
    })
  })

  describe('MockCodeModifier', () => {
    it('should track property updates', () => {
      const modifier = createMockCodeModifier('Frame bg #1a1a1a')

      modifier.updateProperty('node-1', 'bg', '#2563eb')

      expect(modifier._lastUpdate).toEqual({ nodeId: 'node-1', prop: 'bg', value: '#2563eb' })
      expect(modifier._updateHistory).toHaveLength(1)
    })

    it('should return success result', () => {
      const modifier = createMockCodeModifier()

      const result = modifier.updateProperty('node-1', 'pad', '20')

      expect(result.success).toBe(true)
      expect(result.newSource).toBeDefined()
    })

    it('should accumulate update history', () => {
      const modifier = createMockCodeModifier()

      modifier.updateProperty('node-1', 'bg', '#fff')
      modifier.updateProperty('node-1', 'pad', '16')
      modifier.addProperty('node-1', 'rad', '8')

      expect(modifier._updateHistory).toHaveLength(3)
    })
  })

  describe('MockSelectionProvider', () => {
    it('should manage listeners', () => {
      const provider = createMockSelectionProvider()
      const listener = vi.fn()

      const unsubscribe = provider.subscribe(listener)
      expect(provider._listeners.size).toBe(1)

      unsubscribe()
      expect(provider._listeners.size).toBe(0)
    })

    it('should trigger selection change', () => {
      const provider = createMockSelectionProvider()
      const listener = vi.fn()

      provider.subscribe(listener)
      provider._triggerSelection('node-5')

      expect(listener).toHaveBeenCalledWith('node-5', null)
      expect(provider._selection).toBe('node-5')
    })

    it('should track previous selection', () => {
      const provider = createMockSelectionProvider()
      const listener = vi.fn()

      provider.subscribe(listener)
      provider._triggerSelection('node-1')
      provider._triggerSelection('node-2')

      expect(listener).toHaveBeenLastCalledWith('node-2', 'node-1')
    })

    it('should support breadcrumb listeners', () => {
      const provider = createMockSelectionProvider()
      const listener = vi.fn()

      provider.subscribeBreadcrumb(listener)
      provider._triggerBreadcrumb([{ nodeId: 'node-1', name: 'Frame' }])

      expect(listener).toHaveBeenCalledWith([{ nodeId: 'node-1', name: 'Frame' }])
    })
  })
})

describe('Property Panel Helpers Verification', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createTestContainer()
  })

  afterEach(() => {
    removeTestContainer(container)
  })

  describe('Container Management', () => {
    it('should create and append container to body', () => {
      expect(document.body.contains(container)).toBe(true)
      expect(container.id).toBe('test-property-panel')
    })

    it('should remove container from body', () => {
      removeTestContainer(container)
      expect(document.body.contains(container)).toBe(false)
    })
  })

  describe('DOM Queries', () => {
    it('should find property input', () => {
      container.innerHTML = '<input data-property="bg" value="#fff">'

      const input = getPropertyInput(container, 'bg')
      expect(input).toBeDefined()
      expect(input?.value).toBe('#fff')
    })

    it('should return null for missing property', () => {
      container.innerHTML = '<input data-property="bg">'

      const input = getPropertyInput(container, 'pad')
      expect(input).toBeNull()
    })

    it('should find all property fields', () => {
      container.innerHTML = `
        <div class="pp-field"></div>
        <div class="pp-field"></div>
        <div class="property-field"></div>
      `

      const fields = getAllPropertyFields(container)
      expect(fields).toHaveLength(3)
    })
  })

  describe('State Detection', () => {
    it('should detect empty state', () => {
      container.innerHTML = '<div class="pp-empty">Select an element</div>'
      expect(isEmptyState(container)).toBe(true)
    })

    it('should detect content state', () => {
      container.innerHTML = '<div class="pp-content">Properties here</div>'
      expect(hasContent(container)).toBe(true)
    })
  })

  describe('Modifier Assertions', () => {
    it('should assert property was updated', () => {
      const modifier = createMockCodeModifier()
      modifier.updateProperty('node-1', 'bg', '#2563eb')

      expect(() => assertPropertyUpdated(modifier, 'node-1', 'bg', '#2563eb')).not.toThrow()
    })

    it('should throw if property was not updated', () => {
      const modifier = createMockCodeModifier()
      modifier.updateProperty('node-1', 'bg', '#2563eb')

      expect(() => assertPropertyUpdated(modifier, 'node-1', 'pad', '16')).toThrow()
    })

    it('should assert no updates', () => {
      const modifier = createMockCodeModifier()

      expect(() => assertNoPropertyUpdates(modifier)).not.toThrow()
    })

    it('should throw if updates exist', () => {
      const modifier = createMockCodeModifier()
      modifier.updateProperty('node-1', 'bg', '#fff')

      expect(() => assertNoPropertyUpdates(modifier)).toThrow()
    })
  })
})
