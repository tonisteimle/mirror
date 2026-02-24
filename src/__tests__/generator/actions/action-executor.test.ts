import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeAction, ActionExecutorContext } from '../../../generator/actions/action-executor'
import type { ActionStatement, ASTNode, ComponentTemplate } from '../../../parser/parser'
import type { BehaviorRegistry } from '../../../generator/behaviors'

// Mock behavior registry
function createMockBehaviorRegistry(): BehaviorRegistry {
  const states = new Map<string, string>()
  const highlightedItems = new Map<string, Set<string>>()
  const selectedItems = new Map<string, Set<string>>()
  const containerItems = new Map<string, string[]>()

  return {
    getHandler: vi.fn(),
    getState: (id: string) => states.get(id),
    setState: (id: string, state: string) => states.set(id, state),
    toggle: vi.fn((id: string) => {
      const current = states.get(id)
      states.set(id, current === 'open' ? 'closed' : 'open')
    }),
    highlight: vi.fn((itemId: string, containerId: string) => {
      highlightedItems.set(containerId, new Set([itemId]))
    }),
    highlightNext: vi.fn(),
    highlightPrev: vi.fn(),
    highlightFirst: vi.fn(),
    highlightLast: vi.fn(),
    highlightSelfAndBefore: vi.fn(),
    highlightAll: vi.fn(),
    highlightNone: vi.fn((containerId: string) => {
      highlightedItems.set(containerId, new Set())
    }),
    select: vi.fn((itemId: string, containerId: string) => {
      selectedItems.set(containerId, new Set([itemId]))
    }),
    selectHighlighted: vi.fn(),
    selectSelfAndBefore: vi.fn(),
    selectAll: vi.fn(),
    selectNone: vi.fn((containerId: string) => {
      selectedItems.set(containerId, new Set())
    }),
    filter: vi.fn(),
    deactivateSiblings: vi.fn(),
    getHighlightedItem: (containerId: string) => {
      const items = highlightedItems.get(containerId)
      return items?.values().next().value || null
    },
    getSelectedItem: (containerId: string) => {
      const items = selectedItems.get(containerId)
      return items?.values().next().value || null
    },
    getHighlightedItems: (containerId: string) => highlightedItems.get(containerId) || new Set(),
    getSelectedItems: (containerId: string) => selectedItems.get(containerId) || new Set(),
    isItemHighlighted: (itemId: string, containerId: string) => {
      return highlightedItems.get(containerId)?.has(itemId) || false
    },
    isItemSelected: (itemId: string, containerId: string) => {
      return selectedItems.get(containerId)?.has(itemId) || false
    },
    getFilterQuery: () => '',
    registerContainerItem: (containerId: string, itemId: string) => {
      const items = containerItems.get(containerId) || []
      items.push(itemId)
      containerItems.set(containerId, items)
    },
    unregisterContainerItem: vi.fn(),
  }
}

// Create minimal node
function createNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    type: 'component',
    name: 'TestComponent',
    id: 'test-1',
    properties: {},
    children: [],
    ...overrides,
  }
}

// Create context
function createContext(overrides: Partial<ActionExecutorContext> = {}): ActionExecutorContext {
  return {
    node: createNode(),
    currentState: 'default',
    setCurrentState: vi.fn(),
    variables: {},
    setVariables: vi.fn(),
    registry: null,
    behaviorRegistry: createMockBehaviorRegistry(),
    overlayRegistry: null,
    templateRegistry: new Map(),
    ...overrides,
  }
}

describe('Action Executor', () => {
  describe('toggle action', () => {
    it('toggles between states on self', () => {
      const setCurrentState = vi.fn()
      const node = createNode({
        states: [
          { name: 'on', properties: {} },
          { name: 'off', properties: {} },
        ],
      })
      const context = createContext({
        node,
        currentState: 'on',
        setCurrentState,
      })

      const action: ActionStatement = {
        type: 'toggle',
        target: 'self',
      }

      executeAction(action, context)
      expect(setCurrentState).toHaveBeenCalledWith('off')
    })

    it('toggles to first state when at last state', () => {
      const setCurrentState = vi.fn()
      const node = createNode({
        states: [
          { name: 'on', properties: {} },
          { name: 'off', properties: {} },
        ],
      })
      const context = createContext({
        node,
        currentState: 'off',
        setCurrentState,
      })

      const action: ActionStatement = {
        type: 'toggle',
        target: 'self',
      }

      executeAction(action, context)
      expect(setCurrentState).toHaveBeenCalledWith('on')
    })

    it('toggles target component via behavior registry', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      const context = createContext({ behaviorRegistry })

      const action: ActionStatement = {
        type: 'toggle',
        target: 'Menu',
      }

      // First toggle: without hidden template, defaults to closed
      executeAction(action, context)
      expect(behaviorRegistry.getState('Menu')).toBe('closed')

      // Second toggle: goes to open
      executeAction(action, context)
      expect(behaviorRegistry.getState('Menu')).toBe('open')
    })
  })

  describe('show/hide actions', () => {
    it('show sets target to open state', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      const context = createContext({ behaviorRegistry })

      const action: ActionStatement = {
        type: 'show',
        target: 'Panel',
      }

      executeAction(action, context)
      expect(behaviorRegistry.getState('Panel')).toBe('open')
    })

    it('hide sets target to closed state', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      behaviorRegistry.setState('Panel', 'open')
      const context = createContext({ behaviorRegistry })

      const action: ActionStatement = {
        type: 'hide',
        target: 'Panel',
      }

      executeAction(action, context)
      expect(behaviorRegistry.getState('Panel')).toBe('closed')
    })
  })

  describe('change action', () => {
    it('changes self state', () => {
      const setCurrentState = vi.fn()
      const context = createContext({ setCurrentState })

      const action: ActionStatement = {
        type: 'change',
        target: 'self',
        toState: 'active',
      }

      executeAction(action, context)
      expect(setCurrentState).toHaveBeenCalledWith('active')
    })

    it('changes target component state via registry', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      const context = createContext({ behaviorRegistry })

      const action: ActionStatement = {
        type: 'change',
        target: 'Button',
        toState: 'disabled',
      }

      executeAction(action, context)
      expect(behaviorRegistry.getState('Button')).toBe('disabled')
    })
  })

  describe('highlight action', () => {
    it('highlights self', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      const node = createNode({ id: 'item-1', name: 'Item' })
      const context = createContext({
        node,
        behaviorRegistry,
        containerContext: { containerId: 'menu-1', containerName: 'Menu' },
      })

      const action: ActionStatement = {
        type: 'highlight',
        target: 'self',
      }

      executeAction(action, context)
      expect(behaviorRegistry.highlight).toHaveBeenCalledWith('item-1', 'Menu')
    })

    it('highlights next item', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      const context = createContext({
        behaviorRegistry,
        containerContext: { containerId: 'menu-1', containerName: 'Menu' },
      })

      const action: ActionStatement = {
        type: 'highlight',
        target: 'next',
        inContainer: 'Menu',
      }

      executeAction(action, context)
      expect(behaviorRegistry.highlightNext).toHaveBeenCalledWith('Menu')
    })

    it('highlights prev item', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      const context = createContext({ behaviorRegistry })

      const action: ActionStatement = {
        type: 'highlight',
        target: 'prev',
        inContainer: 'List',
      }

      executeAction(action, context)
      expect(behaviorRegistry.highlightPrev).toHaveBeenCalledWith('List')
    })
  })

  describe('select action', () => {
    it('selects self', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      const node = createNode({ id: 'item-2', name: 'Item' })
      const context = createContext({
        node,
        behaviorRegistry,
        containerContext: { containerId: 'list-1', containerName: 'List' },
      })

      const action: ActionStatement = {
        type: 'select',
        target: 'self',
      }

      executeAction(action, context)
      expect(behaviorRegistry.select).toHaveBeenCalledWith('item-2', 'List')
    })

    it('selects highlighted item', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      const context = createContext({ behaviorRegistry })

      const action: ActionStatement = {
        type: 'select',
        target: 'highlighted',
        inContainer: 'Dropdown',
      }

      executeAction(action, context)
      expect(behaviorRegistry.selectHighlighted).toHaveBeenCalledWith('Dropdown')
    })
  })

  describe('activate/deactivate actions', () => {
    it('activates self', () => {
      const setCurrentState = vi.fn()
      const behaviorRegistry = createMockBehaviorRegistry()
      const node = createNode({ id: 'tab-1' })
      const context = createContext({
        node,
        setCurrentState,
        behaviorRegistry,
      })

      const action: ActionStatement = {
        type: 'activate',
        target: 'self',
      }

      executeAction(action, context)
      expect(setCurrentState).toHaveBeenCalledWith('active')
      expect(behaviorRegistry.getState('tab-1')).toBe('active')
    })

    it('deactivates siblings', () => {
      const behaviorRegistry = createMockBehaviorRegistry()
      const node = createNode({ id: 'tab-1', name: 'Tab' })
      const context = createContext({
        node,
        behaviorRegistry,
        containerContext: { containerId: 'tabs-1', containerName: 'Tabs' },
      })

      const action: ActionStatement = {
        type: 'deactivate-siblings',
      }

      executeAction(action, context)
      expect(behaviorRegistry.deactivateSiblings).toHaveBeenCalledWith('tab-1', 'Tabs')
    })
  })

  describe('assign action', () => {
    it('assigns value to variable', () => {
      const setVariables = vi.fn()
      const context = createContext({ setVariables })

      const action: ActionStatement = {
        type: 'assign',
        target: 'selectedId',
        value: '123',
      }

      executeAction(action, context)
      expect(setVariables).toHaveBeenCalled()
    })
  })

  describe('alert action', () => {
    it('shows alert with message', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      const context = createContext()

      const action: ActionStatement = {
        type: 'alert',
        target: 'Hello World',
      }

      executeAction(action, context)
      expect(alertSpy).toHaveBeenCalledWith('Hello World')
      alertSpy.mockRestore()
    })
  })
})
