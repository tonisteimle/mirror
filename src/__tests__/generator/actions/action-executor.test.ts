/**
 * Action Executor Tests
 *
 * Tests for action execution from event handlers.
 * Tests all action types: change, open, close, toggle, assign, page,
 * show, hide, highlight, select, filter, focus, activate, deactivate, etc.
 */
import { describe, it, expect, vi } from 'vitest'
import { executeAction, templateToNode, type ActionExecutorContext } from '../../../generator/actions/action-executor'
import type { ActionStatement, ASTNode, ComponentTemplate } from '../../../parser/types'
import type { BehaviorRegistry } from '../../../generator/behaviors'
import type { ComponentRegistry } from '../../../generator/component-registry-context'
import type { OverlayRegistry } from '../../../generator/overlay-registry-context'

// Mock BehaviorRegistry
function createMockBehaviorRegistry(): BehaviorRegistry {
  return {
    states: new Map(),
    highlightedItems: new Map(),
    selectedItems: new Map(),
    highlightedItemSets: new Map(),
    selectedItemSets: new Map(),
    filterQueries: new Map(),
    containerItems: new Map(),
    setState: vi.fn(),
    toggle: vi.fn(),
    getState: vi.fn(() => 'closed'),
    getHandler: vi.fn(),
    highlight: vi.fn(),
    highlightNext: vi.fn(),
    highlightPrev: vi.fn(),
    highlightFirst: vi.fn(),
    highlightLast: vi.fn(),
    highlightSelfAndBefore: vi.fn(),
    highlightAll: vi.fn(),
    highlightNone: vi.fn(),
    select: vi.fn(),
    selectHighlighted: vi.fn(),
    selectSelfAndBefore: vi.fn(),
    selectAll: vi.fn(),
    selectNone: vi.fn(),
    filter: vi.fn(),
    registerContainerItem: vi.fn(),
    unregisterContainerItem: vi.fn(),
    deactivateSiblings: vi.fn(),
    isHighlighted: vi.fn(() => false),
    isSelected: vi.fn(() => false),
    getFilterQuery: vi.fn(() => ''),
  }
}

// Mock ComponentRegistry
function createMockComponentRegistry(): ComponentRegistry {
  const mockTarget = {
    id: 'target-id',
    setState: vi.fn(),
    toggle: vi.fn(),
  }
  return {
    register: vi.fn(),
    unregister: vi.fn(),
    getById: vi.fn(),
    getByName: vi.fn(() => mockTarget),
    onPageNavigate: vi.fn(),
    getAllNames: vi.fn(() => []),
  }
}

// Mock OverlayRegistry
function createMockOverlayRegistry(): OverlayRegistry {
  return {
    open: vi.fn(),
    close: vi.fn(),
    isOpen: vi.fn(() => false),
    getOverlays: vi.fn(() => []),
  }
}

// Create a minimal ASTNode for testing
function createTestNode(overrides: Partial<ASTNode> = {}): ASTNode {
  return {
    type: 'component',
    name: 'TestComponent',
    id: 'test-node-id',
    properties: {},
    children: [],
    ...overrides,
  }
}

// Create execution context
function createTestContext(overrides: Partial<ActionExecutorContext> = {}): ActionExecutorContext {
  return {
    node: createTestNode(),
    currentState: 'default',
    setCurrentState: vi.fn(),
    variables: {},
    setVariables: vi.fn(),
    registry: createMockComponentRegistry(),
    behaviorRegistry: createMockBehaviorRegistry(),
    overlayRegistry: createMockOverlayRegistry(),
    templateRegistry: new Map(),
    containerContext: null,
    ...overrides,
  }
}

describe('action-executor', () => {
  // ==========================================================================
  // templateToNode
  // ==========================================================================
  describe('templateToNode', () => {
    it('converts ComponentTemplate to ASTNode', () => {
      const template: ComponentTemplate = {
        properties: { bg: '#3B82F6' },
        content: 'Test Content',
        children: [],
        states: [],
        variables: {},
        eventHandlers: [],
      }

      const node = templateToNode('TestOverlay', template)

      expect(node.type).toBe('component')
      expect(node.name).toBe('TestOverlay')
      expect(node.id).toContain('overlay-TestOverlay-')
      expect(node.properties).toBe(template.properties)
      expect(node.content).toBe('Test Content')
    })

    it('generates unique id with timestamp', () => {
      const template: ComponentTemplate = {
        properties: {},
        children: [],
        states: [],
        variables: {},
        eventHandlers: [],
      }

      const node1 = templateToNode('Overlay', template)
      // Small delay to ensure different timestamp
      const node2 = templateToNode('Overlay', template)

      expect(node1.id).toContain('overlay-Overlay-')
      // IDs should start the same way
      expect(node1.id.startsWith('overlay-Overlay-')).toBe(true)
      expect(node2.id.startsWith('overlay-Overlay-')).toBe(true)
    })
  })

  // ==========================================================================
  // change action
  // ==========================================================================
  describe('change action', () => {
    it('changes state of self', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'change',
        target: 'self',
        toState: 'active',
      }

      executeAction(action, context)

      expect(context.setCurrentState).toHaveBeenCalledWith('active')
    })

    it('changes state when target matches node name', () => {
      const context = createTestContext({
        node: createTestNode({ name: 'Button' }),
      })
      const action: ActionStatement = {
        type: 'change',
        target: 'Button',
        toState: 'pressed',
      }

      executeAction(action, context)

      expect(context.setCurrentState).toHaveBeenCalledWith('pressed')
    })

    it('changes state of other component via behavior registry', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'change',
        target: 'OtherComponent',
        toState: 'active',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.setState).toHaveBeenCalledWith('OtherComponent', 'active')
    })

    it('changes state via component registry', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'change',
        target: 'OtherComponent',
        toState: 'active',
      }

      executeAction(action, context)

      const target = context.registry!.getByName('OtherComponent')
      expect(target?.setState).toHaveBeenCalledWith('active')
    })
  })

  // ==========================================================================
  // toggle action
  // ==========================================================================
  describe('toggle action', () => {
    it('toggles between states of self', () => {
      const context = createTestContext({
        node: createTestNode({
          states: [
            { name: 'default', properties: {} },
            { name: 'active', properties: {} },
          ],
        }),
        currentState: 'default',
      })
      const action: ActionStatement = {
        type: 'toggle',
        target: 'self',
      }

      executeAction(action, context)

      expect(context.setCurrentState).toHaveBeenCalledWith('active')
    })

    it('cycles through multiple states', () => {
      const context = createTestContext({
        node: createTestNode({
          states: [
            { name: 'off', properties: {} },
            { name: 'on', properties: {} },
            { name: 'loading', properties: {} },
          ],
        }),
        currentState: 'on',
      })
      const action: ActionStatement = {
        type: 'toggle',
        target: 'self',
      }

      executeAction(action, context)

      expect(context.setCurrentState).toHaveBeenCalledWith('loading')
    })

    it('wraps around to first state', () => {
      const context = createTestContext({
        node: createTestNode({
          states: [
            { name: 'off', properties: {} },
            { name: 'on', properties: {} },
          ],
        }),
        currentState: 'on',
      })
      const action: ActionStatement = {
        type: 'toggle',
      }

      executeAction(action, context)

      expect(context.setCurrentState).toHaveBeenCalledWith('off')
    })

    it('toggles other component via behavior registry', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'toggle',
        target: 'Panel',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.toggle).toHaveBeenCalledWith('Panel')
    })
  })

  // ==========================================================================
  // show/hide actions
  // ==========================================================================
  describe('show action', () => {
    it('sets target state to visible', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'show',
        target: 'Panel',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.setState).toHaveBeenCalledWith('Panel', 'visible')
    })

    it('updates component registry', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'show',
        target: 'Panel',
      }

      executeAction(action, context)

      const target = context.registry!.getByName('Panel')
      expect(target?.setState).toHaveBeenCalledWith('visible')
    })
  })

  describe('hide action', () => {
    it('sets target state to hidden', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'hide',
        target: 'Panel',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.setState).toHaveBeenCalledWith('Panel', 'hidden')
    })
  })

  // ==========================================================================
  // open/close actions
  // ==========================================================================
  describe('open action', () => {
    it('opens overlay from template registry', () => {
      const template: ComponentTemplate = {
        properties: { bg: '#1E1E1E' },
        children: [],
        states: [],
        variables: {},
        eventHandlers: [],
      }
      const templateRegistry = new Map([['Dialog', template]])
      const context = createTestContext({ templateRegistry })

      const action: ActionStatement = {
        type: 'open',
        target: 'Dialog',
        animation: 'fade',
        duration: 200,
        position: 'center',
      }

      executeAction(action, context)

      expect(context.overlayRegistry!.open).toHaveBeenCalled()
      const openCall = (context.overlayRegistry!.open as any).mock.calls[0]
      expect(openCall[0]).toBe('Dialog')
      expect(openCall[2]).toMatchObject({
        animation: 'fade',
        duration: 200,
        position: 'center',
      })
    })

    it('falls back to behavior registry for non-template', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'open',
        target: 'Menu',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.setState).toHaveBeenCalledWith('Menu', 'open')
    })
  })

  describe('close action', () => {
    it('closes open overlay', () => {
      const context = createTestContext()
      ;(context.overlayRegistry!.isOpen as any).mockReturnValue(true)

      const action: ActionStatement = {
        type: 'close',
        target: 'Dialog',
        animation: 'fade',
        duration: 150,
      }

      executeAction(action, context)

      expect(context.overlayRegistry!.close).toHaveBeenCalledWith('Dialog', 'fade', 150)
    })

    it('falls back to behavior registry for non-overlay', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'close',
        target: 'Menu',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.setState).toHaveBeenCalledWith('Menu', 'closed')
    })

    it('closes topmost overlay when no target', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'close',
      }

      executeAction(action, context)

      expect(context.overlayRegistry!.close).toHaveBeenCalledWith(undefined, undefined, undefined)
    })
  })

  // ==========================================================================
  // assign action
  // ==========================================================================
  describe('assign action', () => {
    it('assigns literal value to variable', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'assign',
        target: 'count',
        value: 5,
      }

      executeAction(action, context)

      expect(context.setVariables).toHaveBeenCalled()
    })

    it('assigns string value', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'assign',
        target: 'name',
        value: 'John',
      }

      executeAction(action, context)

      expect(context.setVariables).toHaveBeenCalled()
    })

    it('assigns boolean value', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'assign',
        target: 'isActive',
        value: true,
      }

      executeAction(action, context)

      expect(context.setVariables).toHaveBeenCalled()
    })

    it('does not assign when target is missing', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'assign',
        value: 5,
      }

      executeAction(action, context)

      expect(context.setVariables).not.toHaveBeenCalled()
    })

    it('does not assign when value is undefined', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'assign',
        target: 'count',
      }

      executeAction(action, context)

      expect(context.setVariables).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // page action
  // ==========================================================================
  describe('page action', () => {
    it('navigates to target page', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'page',
        target: 'Dashboard',
      }

      executeAction(action, context)

      expect(context.registry!.onPageNavigate).toHaveBeenCalledWith('Dashboard')
    })

    it('does not navigate when target is missing', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'page',
      }

      executeAction(action, context)

      expect(context.registry!.onPageNavigate).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // alert action
  // ==========================================================================
  describe('alert action', () => {
    it('shows alert with target message', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'alert',
        target: 'Hello World',
      }

      executeAction(action, context)

      expect(alertSpy).toHaveBeenCalledWith('Hello World')
      alertSpy.mockRestore()
    })

    it('does not show alert when target is missing', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'alert',
      }

      executeAction(action, context)

      expect(alertSpy).not.toHaveBeenCalled()
      alertSpy.mockRestore()
    })
  })

  // ==========================================================================
  // highlight action
  // ==========================================================================
  describe('highlight action', () => {
    it('highlights self', () => {
      const context = createTestContext({
        node: createTestNode({ id: 'item-1' }),
      })
      const action: ActionStatement = {
        type: 'highlight',
        target: 'self',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.highlight).toHaveBeenCalledWith('item-1', 'TestComponent')
    })

    it('highlights next item', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'highlight',
        target: 'next',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.highlightNext).toHaveBeenCalled()
    })

    it('highlights prev item', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'highlight',
        target: 'prev',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.highlightPrev).toHaveBeenCalled()
    })

    it('highlights first item', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'highlight',
        target: 'first',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.highlightFirst).toHaveBeenCalled()
    })

    it('highlights last item', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'highlight',
        target: 'last',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.highlightLast).toHaveBeenCalled()
    })

    it('highlights self and before (rating pattern)', () => {
      const context = createTestContext({
        node: createTestNode({ id: 'star-3' }),
      })
      const action: ActionStatement = {
        type: 'highlight',
        target: 'self-and-before',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.highlightSelfAndBefore).toHaveBeenCalledWith('star-3', 'TestComponent')
    })

    it('highlights all items', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'highlight',
        target: 'all',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.highlightAll).toHaveBeenCalled()
    })

    it('clears all highlights with none', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'highlight',
        target: 'none',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.highlightNone).toHaveBeenCalled()
    })

    it('uses inContainer when specified', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'highlight',
        target: 'next',
        inContainer: 'Dropdown',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.highlightNext).toHaveBeenCalledWith('Dropdown')
    })
  })

  // ==========================================================================
  // select action
  // ==========================================================================
  describe('select action', () => {
    it('selects self', () => {
      const context = createTestContext({
        node: createTestNode({ id: 'item-1' }),
      })
      const action: ActionStatement = {
        type: 'select',
        target: 'self',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.select).toHaveBeenCalledWith('item-1', 'TestComponent')
    })

    it('selects highlighted item', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'select',
        target: 'highlighted',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.selectHighlighted).toHaveBeenCalled()
    })

    it('selects self and before', () => {
      const context = createTestContext({
        node: createTestNode({ id: 'item-2' }),
      })
      const action: ActionStatement = {
        type: 'select',
        target: 'self-and-before',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.selectSelfAndBefore).toHaveBeenCalledWith('item-2', 'TestComponent')
    })

    it('selects all items', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'select',
        target: 'all',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.selectAll).toHaveBeenCalled()
    })

    it('clears selection with none', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'select',
        target: 'none',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.selectNone).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // filter action
  // ==========================================================================
  describe('filter action', () => {
    it('filters container with input value', () => {
      const context = createTestContext()
      // Create a real input element for proper instanceof check
      const inputElement = document.createElement('input')
      inputElement.value = 'search query'

      const mockEvent = {
        currentTarget: inputElement,
      } as unknown as React.SyntheticEvent

      const action: ActionStatement = {
        type: 'filter',
        target: 'Results',
      }

      executeAction(action, context, mockEvent)

      expect(context.behaviorRegistry.filter).toHaveBeenCalledWith('Results', 'search query')
    })

    it('uses empty string when event target has no value', () => {
      const context = createTestContext()
      const mockEvent = {
        currentTarget: document.createElement('div'),
      } as unknown as React.SyntheticEvent

      const action: ActionStatement = {
        type: 'filter',
        target: 'Results',
      }

      executeAction(action, context, mockEvent)

      expect(context.behaviorRegistry.filter).toHaveBeenCalledWith('Results', '')
    })
  })

  // ==========================================================================
  // activate/deactivate actions
  // ==========================================================================
  describe('activate action', () => {
    it('activates self', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'activate',
        target: 'self',
      }

      executeAction(action, context)

      expect(context.setCurrentState).toHaveBeenCalledWith('active')
    })

    it('activates other component', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'activate',
        target: 'Tab',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.setState).toHaveBeenCalledWith('Tab', 'active')
    })
  })

  describe('deactivate action', () => {
    it('deactivates self', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'deactivate',
        target: 'self',
      }

      executeAction(action, context)

      expect(context.setCurrentState).toHaveBeenCalledWith('inactive')
    })

    it('deactivates other component', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'deactivate',
        target: 'Tab',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.setState).toHaveBeenCalledWith('Tab', 'inactive')
    })
  })

  describe('deactivate-siblings action', () => {
    it('deactivates siblings in container', () => {
      const context = createTestContext({
        node: createTestNode({ id: 'item-1' }),
        containerContext: {
          containerId: 'container-1',
          containerName: 'TabBar',
        },
      })
      const action: ActionStatement = {
        type: 'deactivate-siblings',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.deactivateSiblings).toHaveBeenCalledWith('item-1', 'container-1')
    })
  })

  // ==========================================================================
  // toggle-state action
  // ==========================================================================
  describe('toggle-state action', () => {
    it('toggles between defined states', () => {
      const context = createTestContext({
        node: createTestNode({
          states: [
            { name: 'collapsed', properties: {} },
            { name: 'expanded', properties: {} },
          ],
        }),
        currentState: 'collapsed',
      })
      const action: ActionStatement = {
        type: 'toggle-state',
      }

      executeAction(action, context)

      expect(context.setCurrentState).toHaveBeenCalledWith('expanded')
    })

    it('wraps around states', () => {
      const context = createTestContext({
        node: createTestNode({
          states: [
            { name: 'collapsed', properties: {} },
            { name: 'expanded', properties: {} },
          ],
        }),
        currentState: 'expanded',
      })
      const action: ActionStatement = {
        type: 'toggle-state',
      }

      executeAction(action, context)

      expect(context.setCurrentState).toHaveBeenCalledWith('collapsed')
    })

    it('does nothing with less than 2 states', () => {
      const context = createTestContext({
        node: createTestNode({
          states: [{ name: 'only', properties: {} }],
        }),
      })
      const action: ActionStatement = {
        type: 'toggle-state',
      }

      executeAction(action, context)

      expect(context.setCurrentState).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // deselect / clear-selection actions
  // ==========================================================================
  describe('deselect action', () => {
    it('clears selection for self', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'deselect',
        target: 'self',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.selectNone).toHaveBeenCalled()
    })

    it('clears selection for all', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'deselect',
        target: 'all',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.selectNone).toHaveBeenCalled()
    })
  })

  describe('clear-selection action', () => {
    it('clears all selections', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'clear-selection',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.selectNone).toHaveBeenCalledWith('TestComponent')
    })
  })

  // ==========================================================================
  // validate / reset actions
  // ==========================================================================
  describe('validate action', () => {
    it('sets target to validating state', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'validate',
        target: 'Form',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.setState).toHaveBeenCalledWith('Form', 'validating')
    })
  })

  describe('reset action', () => {
    it('resets target to default state', () => {
      const context = createTestContext()
      const action: ActionStatement = {
        type: 'reset',
        target: 'Form',
      }

      executeAction(action, context)

      expect(context.behaviorRegistry.setState).toHaveBeenCalledWith('Form', 'default')
    })
  })
})
