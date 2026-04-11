/**
 * Property Panel Mock Adapters Tests
 *
 * Verifies that mock adapters work correctly for testing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockSelectionPort,
  createMockExtractionPort,
  createMockModificationPort,
  createMockTokenPort,
  createMockLayoutPort,
  createMockEventPort,
  createMockPorts,
  createMockElement,
  createMockProperty,
} from '../../../studio/panels/property/adapters/mock-adapters'

// ============================================
// Selection Port
// ============================================

describe('MockSelectionPort', () => {
  it('starts with null selection by default', () => {
    const port = createMockSelectionPort()
    expect(port.getSelection()).toBeNull()
  })

  it('starts with initial selection if provided', () => {
    const port = createMockSelectionPort('node-1')
    expect(port.getSelection()).toBe('node-1')
  })

  it('notifies subscribers on selection change', () => {
    const port = createMockSelectionPort()
    const listener = vi.fn()
    port.subscribe(listener)

    port.select('node-1')

    expect(listener).toHaveBeenCalledWith('node-1', null)
  })

  it('notifies with previous selection', () => {
    const port = createMockSelectionPort('node-1')
    const listener = vi.fn()
    port.subscribe(listener)

    port.select('node-2')

    expect(listener).toHaveBeenCalledWith('node-2', 'node-1')
  })

  it('unsubscribes correctly', () => {
    const port = createMockSelectionPort()
    const listener = vi.fn()
    const unsubscribe = port.subscribe(listener)

    unsubscribe()
    port.select('node-1')

    expect(listener).not.toHaveBeenCalled()
  })

  it('clears selection', () => {
    const port = createMockSelectionPort('node-1')
    port.clearSelection()
    expect(port.getSelection()).toBeNull()
  })

  it('tracks selection history', () => {
    const port = createMockSelectionPort()
    port.select('node-1')
    port.select('node-2')
    port.select('node-3')

    expect(port._state.selectionHistory).toEqual([null, 'node-1', 'node-2', 'node-3'])
  })

  it('simulates selection correctly', () => {
    const port = createMockSelectionPort()
    port._simulateSelect('node-1')
    expect(port.getSelection()).toBe('node-1')
  })
})

// ============================================
// Extraction Port
// ============================================

describe('MockExtractionPort', () => {
  it('returns null for unknown element', () => {
    const port = createMockExtractionPort()
    expect(port.getProperties('unknown')).toBeNull()
  })

  it('returns added element', () => {
    const port = createMockExtractionPort()
    const element = createMockElement('node-1', 'Frame')
    port._addElement('node-1', element)

    expect(port.getProperties('node-1')).toEqual(element)
  })

  it('returns null for unknown definition', () => {
    const port = createMockExtractionPort()
    expect(port.getPropertiesForDefinition('Unknown')).toBeNull()
  })

  it('returns added definition', () => {
    const port = createMockExtractionPort()
    const element = createMockElement('def:Button', 'Button', [], { isDefinition: true })
    port._addDefinition('Button', element)

    expect(port.getPropertiesForDefinition('Button')).toEqual(element)
  })

  it('tracks get calls', () => {
    const port = createMockExtractionPort()
    port.getProperties('node-1')
    port.getProperties('node-2')

    expect(port._state.getCalls).toEqual(['node-1', 'node-2'])
  })

  it('clears state', () => {
    const port = createMockExtractionPort()
    const element = createMockElement('node-1', 'Frame')
    port._addElement('node-1', element)
    port.getProperties('node-1')

    port._clear()

    // getCalls should be cleared
    expect(port._state.getCalls).toHaveLength(0)
    // Elements should be cleared
    expect(port.getProperties('node-1')).toBeNull()
  })
})

// ============================================
// Modification Port
// ============================================

describe('MockModificationPort', () => {
  it('records setProperty calls', () => {
    const port = createMockModificationPort()
    port.setProperty('node-1', 'bg', '#fff')

    expect(port._getModifications()).toHaveLength(1)
    expect(port._getModifications()[0]).toMatchObject({
      nodeId: 'node-1',
      type: 'set',
      name: 'bg',
      value: '#fff',
    })
  })

  it('records removeProperty calls', () => {
    const port = createMockModificationPort()
    port.removeProperty('node-1', 'bg')

    expect(port._getModifications()).toHaveLength(1)
    expect(port._getModifications()[0]).toMatchObject({
      nodeId: 'node-1',
      type: 'remove',
      name: 'bg',
    })
  })

  it('records toggleProperty calls', () => {
    const port = createMockModificationPort()
    port.toggleProperty('node-1', 'hidden', true)

    expect(port._getModifications()).toHaveLength(1)
    expect(port._getModifications()[0]).toMatchObject({
      nodeId: 'node-1',
      type: 'toggle',
      name: 'hidden',
      enabled: true,
    })
  })

  it('records batchUpdate calls', () => {
    const port = createMockModificationPort()
    port.batchUpdate('node-1', [
      { name: 'bg', value: '#fff', action: 'set' },
      { name: 'col', value: '', action: 'remove' },
    ])

    expect(port._getModifications()).toHaveLength(1)
    expect(port._getModifications()[0].type).toBe('batch')
    expect(port._getModifications()[0].changes).toHaveLength(2)
  })

  it('returns success by default', () => {
    const port = createMockModificationPort()
    const result = port.setProperty('node-1', 'bg', '#fff')

    expect(result.success).toBe(true)
  })

  it('can simulate failure', () => {
    const port = createMockModificationPort()
    port._setShouldFail(true)

    const result = port.setProperty('node-1', 'bg', '#fff')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Mock error')
  })

  it('clears state', () => {
    const port = createMockModificationPort()
    port.setProperty('node-1', 'bg', '#fff')
    port._setShouldFail(true)

    port._clear()

    expect(port._getModifications()).toHaveLength(0)
    expect(port._state.shouldFail).toBe(false)
  })
})

// ============================================
// Token Port
// ============================================

describe('MockTokenPort', () => {
  it('returns empty array for unknown spacing tokens', () => {
    const port = createMockTokenPort()
    expect(port.getSpacingTokens('pad')).toEqual([])
  })

  it('returns set spacing tokens', () => {
    const port = createMockTokenPort()
    const tokens = [
      { name: 'sm', fullName: 'sm.pad', value: '4' },
      { name: 'md', fullName: 'md.pad', value: '8' },
    ]
    port._setSpacingTokens('pad', tokens)

    expect(port.getSpacingTokens('pad')).toEqual(tokens)
  })

  it('returns empty array for color tokens by default', () => {
    const port = createMockTokenPort()
    expect(port.getColorTokens()).toEqual([])
  })

  it('returns set color tokens', () => {
    const port = createMockTokenPort()
    const tokens = [
      { name: 'primary', fullName: 'primary.bg', value: '#2271C1' },
    ]
    port._setColorTokens(tokens)

    expect(port.getColorTokens()).toEqual(tokens)
  })

  it('returns null for unknown token value', () => {
    const port = createMockTokenPort()
    expect(port.resolveTokenValue('$unknown')).toBeNull()
  })

  it('returns set token value', () => {
    const port = createMockTokenPort()
    port._setTokenValue('$primary', '#2271C1')

    expect(port.resolveTokenValue('$primary')).toBe('#2271C1')
  })

  it('tracks cache invalidation', () => {
    const port = createMockTokenPort()
    expect(port._state.cacheInvalidated).toBe(false)

    port.invalidateCache()

    expect(port._state.cacheInvalidated).toBe(true)
  })
})

// ============================================
// Layout Port
// ============================================

describe('MockLayoutPort', () => {
  it('returns false for positioned container by default', () => {
    const port = createMockLayoutPort()
    expect(port.isInPositionedContainer('node-1')).toBe(false)
  })

  it('returns true for set positioned container', () => {
    const port = createMockLayoutPort()
    port._setInPositionedContainer('node-1', true)

    expect(port.isInPositionedContainer('node-1')).toBe(true)
  })

  it('returns none for parent layout type by default', () => {
    const port = createMockLayoutPort()
    expect(port.getParentLayoutType('node-1')).toBe('none')
  })

  it('returns set parent layout type', () => {
    const port = createMockLayoutPort()
    port._setParentLayoutType('node-1', 'flex')

    expect(port.getParentLayoutType('node-1')).toBe('flex')
  })

  it('returns null for element rect by default', () => {
    const port = createMockLayoutPort()
    expect(port.getElementRect('node-1')).toBeNull()
  })

  it('returns set element rect', () => {
    const port = createMockLayoutPort()
    const rect = { x: 100, y: 100, width: 200, height: 50 }
    port._setElementRect('node-1', rect)

    expect(port.getElementRect('node-1')).toEqual(rect)
  })

  it('clears positioned container', () => {
    const port = createMockLayoutPort()
    port._setInPositionedContainer('node-1', true)
    port._setInPositionedContainer('node-1', false)

    expect(port.isInPositionedContainer('node-1')).toBe(false)
  })
})

// ============================================
// Event Port
// ============================================

describe('MockEventPort', () => {
  it('returns false for isCompiling by default', () => {
    const port = createMockEventPort()
    expect(port.isCompiling()).toBe(false)
  })

  it('sets compiling state', () => {
    const port = createMockEventPort()
    port._setCompiling(true)

    expect(port.isCompiling()).toBe(true)
  })

  it('triggers selection invalidated handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onSelectionInvalidated(handler)

    port._triggerSelectionInvalidated('node-1')

    expect(handler).toHaveBeenCalledWith('node-1')
  })

  it('triggers compile completed handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onCompileCompleted(handler)

    port._triggerCompileCompleted()

    expect(handler).toHaveBeenCalled()
  })

  it('triggers definition selected handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onDefinitionSelected(handler)

    port._triggerDefinitionSelected('MyButton')

    expect(handler).toHaveBeenCalledWith('MyButton')
  })

  it('unsubscribes correctly', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    const unsubscribe = port.onCompileCompleted(handler)

    unsubscribe()
    port._triggerCompileCompleted()

    expect(handler).not.toHaveBeenCalled()
  })

  it('clears state', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onCompileCompleted(handler)
    port._setCompiling(true)

    port._clear()

    expect(port.isCompiling()).toBe(false)
    port._triggerCompileCompleted()
    expect(handler).not.toHaveBeenCalled()
  })
})

// ============================================
// Combined Ports
// ============================================

describe('createMockPorts', () => {
  it('creates all port instances', () => {
    const ports = createMockPorts()

    expect(ports.selection).toBeDefined()
    expect(ports.extraction).toBeDefined()
    expect(ports.modification).toBeDefined()
    expect(ports.tokens).toBeDefined()
    expect(ports.layout).toBeDefined()
    expect(ports.events).toBeDefined()
  })
})

// ============================================
// Test Helpers
// ============================================

describe('createMockElement', () => {
  it('creates element with defaults', () => {
    const element = createMockElement('node-1', 'Frame')

    expect(element.nodeId).toBe('node-1')
    expect(element.componentName).toBe('Frame')
    expect(element.isDefinition).toBe(false)
    expect(element.isTemplateInstance).toBe(false)
    expect(element.allProperties).toEqual([])
    expect(element.categories).toEqual([])
  })

  it('creates element with properties', () => {
    const props = [
      createMockProperty('bg', '#fff'),
      createMockProperty('pad', '16'),
    ]
    const element = createMockElement('node-1', 'Frame', props)

    expect(element.allProperties).toHaveLength(2)
    expect(element.categories).toHaveLength(1) // Both default to 'visual'
  })

  it('creates element with options', () => {
    const element = createMockElement('node-1', 'Button', [], {
      isDefinition: true,
      instanceName: 'MyButton',
    })

    expect(element.isDefinition).toBe(true)
    expect(element.instanceName).toBe('MyButton')
  })
})

describe('createMockProperty', () => {
  it('creates property with defaults', () => {
    const prop = createMockProperty('bg', '#fff')

    expect(prop.name).toBe('bg')
    expect(prop.value).toBe('#fff')
    expect(prop.hasValue).toBe(true)
    expect(prop.source).toBe('instance')
    expect(prop.category).toBe('visual')
  })

  it('creates property with options', () => {
    const prop = createMockProperty('pad', '16', {
      source: 'definition',
      category: 'spacing',
    })

    expect(prop.source).toBe('definition')
    expect(prop.category).toBe('spacing')
  })
})

