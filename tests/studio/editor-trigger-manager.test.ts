/**
 * Trigger Manager Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  EditorTriggerManager,
  createTriggerManager,
  getTriggerManager,
  setTriggerManager,
} from '../../studio/editor/trigger-manager'
import type { TriggerConfig } from '../../studio/editor/triggers/types'

// Mock picker
const createMockPicker = () => ({
  show: vi.fn(),
  hide: vi.fn(),
  showAt: vi.fn(),
  filter: vi.fn(),
  search: vi.fn(),
  navigate: vi.fn(),
  getSelectedIndex: vi.fn(() => 0),
  getFilteredIcons: vi.fn(() => [{ name: 'test-icon' }]),
  getValue: vi.fn(() => 'test-value'),
  getIsOpen: vi.fn(() => true),
})

// Mock editor view
const createMockView = (content: string = 'Box bg #fff') => {
  const doc = {
    toString: () => content,
    lineAt: (pos: number) => {
      const lines = content.split('\n')
      let offset = 0
      for (let i = 0; i < lines.length; i++) {
        const lineEnd = offset + lines[i].length
        if (pos <= lineEnd) {
          return {
            number: i + 1,
            from: offset,
            to: lineEnd,
            text: lines[i],
          }
        }
        offset = lineEnd + 1
      }
      return { number: 1, from: 0, to: content.length, text: content }
    },
    length: content.length,
    sliceString: (from: number, to: number) => content.slice(from, to),
  }

  return {
    state: {
      doc,
      selection: {
        main: { head: 0 },
      },
    },
    dispatch: vi.fn(),
    coordsAtPos: vi.fn(() => ({ left: 100, top: 200, bottom: 220 })),
    posAtCoords: vi.fn(() => 5),
    focus: vi.fn(),
  }
}

describe('EditorTriggerManager', () => {
  let manager: EditorTriggerManager

  beforeEach(() => {
    manager = createTriggerManager()
  })

  afterEach(() => {
    manager.dispose()
  })

  describe('register', () => {
    it('registers a trigger configuration', () => {
      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: createMockPicker(),
        onSelect: vi.fn(),
      }

      manager.register(config)
      expect(manager.getTrigger('test-trigger')).toBe(config)
    })

    it('overwrites existing trigger with same id', () => {
      const config1: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: createMockPicker(),
        onSelect: vi.fn(),
      }

      const config2: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '$' },
        picker: createMockPicker(),
        onSelect: vi.fn(),
      }

      manager.register(config1)
      manager.register(config2)

      const registered = manager.getTrigger('test-trigger')
      expect(registered?.trigger).toEqual({ type: 'char', char: '$' })
    })
  })

  describe('unregister', () => {
    it('removes a registered trigger', () => {
      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: createMockPicker(),
        onSelect: vi.fn(),
      }

      manager.register(config)
      manager.unregister('test-trigger')
      expect(manager.getTrigger('test-trigger')).toBeUndefined()
    })
  })

  describe('isOpen', () => {
    it('returns false when no picker is open', () => {
      expect(manager.isOpen()).toBe(false)
    })

    it('returns true when picker is open', () => {
      const mockPicker = createMockPicker()
      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: mockPicker,
        onSelect: vi.fn(),
      }

      manager.register(config)

      const mockView = createMockView()
      manager.showPicker('test-trigger', 100, 200, 5, mockView as any)

      expect(manager.isOpen()).toBe(true)
    })
  })

  describe('getActiveTrigger', () => {
    it('returns null when no trigger is active', () => {
      expect(manager.getActiveTrigger()).toBeNull()
    })

    it('returns trigger id when active', () => {
      const mockPicker = createMockPicker()
      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: mockPicker,
        onSelect: vi.fn(),
      }

      manager.register(config)

      const mockView = createMockView()
      manager.showPicker('test-trigger', 100, 200, 5, mockView as any)

      expect(manager.getActiveTrigger()).toBe('test-trigger')
    })
  })

  describe('showPicker', () => {
    it('shows picker at specified position', () => {
      const mockPicker = createMockPicker()
      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: mockPicker,
        onSelect: vi.fn(),
      }

      manager.register(config)

      const mockView = createMockView()
      manager.showPicker('test-trigger', 100, 200, 5, mockView as any)

      expect(mockPicker.showAt).toHaveBeenCalledWith(100, 200)
    })

    it('calls picker factory function when provided', () => {
      const mockPicker = createMockPicker()
      const factory = vi.fn(() => mockPicker)

      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: factory,
        onSelect: vi.fn(),
      }

      manager.register(config)

      const mockView = createMockView()
      manager.showPicker('test-trigger', 100, 200, 5, mockView as any)

      expect(factory).toHaveBeenCalled()
    })
  })

  describe('hidePicker', () => {
    it('hides the current picker', () => {
      const mockPicker = createMockPicker()
      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: mockPicker,
        onSelect: vi.fn(),
      }

      manager.register(config)

      const mockView = createMockView()
      manager.showPicker('test-trigger', 100, 200, 5, mockView as any)
      manager.hidePicker()

      expect(mockPicker.hide).toHaveBeenCalled()
      expect(manager.isOpen()).toBe(false)
    })
  })

  describe('filterPicker', () => {
    it('calls filter on picker with filter method', () => {
      const mockPicker = createMockPicker()
      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: mockPicker,
        onSelect: vi.fn(),
      }

      manager.register(config)

      const mockView = createMockView()
      manager.showPicker('test-trigger', 100, 200, 5, mockView as any)
      manager.filterPicker('test')

      expect(mockPicker.filter).toHaveBeenCalledWith('test')
    })
  })

  describe('navigatePicker', () => {
    it('calls navigate on picker', () => {
      const mockPicker = createMockPicker()
      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: mockPicker,
        onSelect: vi.fn(),
      }

      manager.register(config)

      const mockView = createMockView()
      manager.showPicker('test-trigger', 100, 200, 5, mockView as any)
      manager.navigatePicker('down')

      expect(mockPicker.navigate).toHaveBeenCalledWith('down')
    })
  })

  describe('componentPrimitives', () => {
    it('sets and gets component primitives', () => {
      const primitives = new Map([['Logo', 'icon']])
      manager.setComponentPrimitives(primitives)

      expect(manager.getComponentPrimitives()).toBe(primitives)
    })
  })

  describe('createExtensions', () => {
    it('returns an array of extensions', () => {
      const extensions = manager.createExtensions()

      expect(Array.isArray(extensions)).toBe(true)
      expect(extensions.length).toBeGreaterThan(0)
    })
  })

  describe('dispose', () => {
    it('cleans up all state', () => {
      const mockPicker = createMockPicker()
      const config: TriggerConfig = {
        id: 'test-trigger',
        trigger: { type: 'char', char: '#' },
        picker: mockPicker,
        onSelect: vi.fn(),
      }

      manager.register(config)

      const mockView = createMockView()
      manager.showPicker('test-trigger', 100, 200, 5, mockView as any)
      manager.dispose()

      expect(mockPicker.hide).toHaveBeenCalled()
      expect(manager.isOpen()).toBe(false)
      expect(manager.getTrigger('test-trigger')).toBeUndefined()
    })
  })
})

describe('Global Trigger Manager', () => {
  afterEach(() => {
    setTriggerManager(createTriggerManager())
  })

  it('getTriggerManager returns singleton', () => {
    const manager1 = getTriggerManager()
    const manager2 = getTriggerManager()
    expect(manager1).toBe(manager2)
  })

  it('setTriggerManager replaces singleton', () => {
    const customManager = createTriggerManager()
    setTriggerManager(customManager)
    expect(getTriggerManager()).toBe(customManager)
  })
})
