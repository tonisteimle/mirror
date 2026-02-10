/**
 * Event Handlers Tests
 *
 * Tests for event handler factory functions:
 * - executeEventHandler
 * - createClickHandler
 * - createMouseEnterHandler
 * - createMouseLeaveHandler
 * - createChangeHandler
 * - createInputHandler
 * - createFocusHandler
 * - createBlurHandler
 * - createKeyDownHandler
 * - createKeyUpHandler
 */

import { describe, it, expect, vi } from 'vitest'
import type React from 'react'
import type { EventHandler, ActionStatement, Conditional, Condition } from '../../../parser/parser'
import {
  executeEventHandler,
  createClickHandler,
  createMouseEnterHandler,
  createMouseLeaveHandler,
  createChangeHandler,
  createInputHandler,
  createFocusHandler,
  createBlurHandler,
  createKeyDownHandler,
  createKeyUpHandler,
} from '../../../generator/events/event-handlers'

// Helper to create mock event
function createMockMouseEvent(overrides: Partial<React.MouseEvent> = {}): React.MouseEvent {
  return {
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as React.MouseEvent
}

function createMockChangeEvent(): React.ChangeEvent<HTMLInputElement> {
  return {
    target: { value: 'test' },
    stopPropagation: vi.fn(),
  } as unknown as React.ChangeEvent<HTMLInputElement>
}

function createMockFocusEvent(): React.FocusEvent {
  return {
    target: {},
    stopPropagation: vi.fn(),
  } as unknown as React.FocusEvent
}

function createMockKeyboardEvent(key = 'Enter'): React.KeyboardEvent {
  return {
    key,
    stopPropagation: vi.fn(),
  } as unknown as React.KeyboardEvent
}

// Helper to create EventHandler
function createEventHandler(
  event: string,
  actions: (ActionStatement | Conditional)[]
): EventHandler {
  return { event, actions }
}

// Helper to create ActionStatement
function createAction(action: string, args?: unknown[]): ActionStatement {
  return { action, args } as ActionStatement
}

// Helper to create Conditional
function createConditional(
  condition: Condition,
  thenActions: ActionStatement[],
  elseActions?: ActionStatement[]
): Conditional {
  return { condition, thenActions, elseActions }
}

describe('event-handlers', () => {
  describe('executeEventHandler', () => {
    it('executes simple actions', () => {
      const executor = vi.fn()
      const handler = createEventHandler('onclick', [
        createAction('navigate', ['/home']),
      ])

      executeEventHandler(handler, {}, executor)

      expect(executor).toHaveBeenCalledTimes(1)
      expect(executor).toHaveBeenCalledWith(
        { action: 'navigate', args: ['/home'] },
        undefined
      )
    })

    it('executes multiple actions in order', () => {
      const executor = vi.fn()
      const handler = createEventHandler('onclick', [
        createAction('set', ['count', 1]),
        createAction('navigate', ['/next']),
        createAction('log', ['clicked']),
      ])

      executeEventHandler(handler, {}, executor)

      expect(executor).toHaveBeenCalledTimes(3)
      expect(executor).toHaveBeenNthCalledWith(1, { action: 'set', args: ['count', 1] }, undefined)
      expect(executor).toHaveBeenNthCalledWith(2, { action: 'navigate', args: ['/next'] }, undefined)
      expect(executor).toHaveBeenNthCalledWith(3, { action: 'log', args: ['clicked'] }, undefined)
    })

    it('passes event to executor', () => {
      const executor = vi.fn()
      const event = createMockMouseEvent()
      const handler = createEventHandler('onclick', [createAction('click')])

      executeEventHandler(handler, {}, executor, event)

      expect(executor).toHaveBeenCalledWith({ action: 'click', args: undefined }, event)
    })

    it('executes then actions when condition is true', () => {
      const executor = vi.fn()
      const handler = createEventHandler('onclick', [
        createConditional(
          { type: 'var', name: 'isActive' },
          [createAction('activate')],
          [createAction('deactivate')]
        ),
      ])

      executeEventHandler(handler, { isActive: true }, executor)

      expect(executor).toHaveBeenCalledTimes(1)
      expect(executor).toHaveBeenCalledWith({ action: 'activate', args: undefined }, undefined)
    })

    it('executes else actions when condition is false', () => {
      const executor = vi.fn()
      const handler = createEventHandler('onclick', [
        createConditional(
          { type: 'var', name: 'isActive' },
          [createAction('activate')],
          [createAction('deactivate')]
        ),
      ])

      executeEventHandler(handler, { isActive: false }, executor)

      expect(executor).toHaveBeenCalledTimes(1)
      expect(executor).toHaveBeenCalledWith({ action: 'deactivate', args: undefined }, undefined)
    })

    it('skips else actions when condition is false and no else branch', () => {
      const executor = vi.fn()
      const handler = createEventHandler('onclick', [
        createConditional(
          { type: 'var', name: 'isActive' },
          [createAction('activate')]
        ),
      ])

      executeEventHandler(handler, { isActive: false }, executor)

      expect(executor).not.toHaveBeenCalled()
    })

    it('executes multiple actions in conditional branches', () => {
      const executor = vi.fn()
      const handler = createEventHandler('onclick', [
        createConditional(
          { type: 'var', name: 'isActive' },
          [createAction('first'), createAction('second')],
          [createAction('alt1'), createAction('alt2'), createAction('alt3')]
        ),
      ])

      executeEventHandler(handler, { isActive: false }, executor)

      expect(executor).toHaveBeenCalledTimes(3)
    })

    it('mixes simple actions and conditionals', () => {
      const executor = vi.fn()
      const handler = createEventHandler('onclick', [
        createAction('before'),
        createConditional(
          { type: 'var', name: 'flag' },
          [createAction('conditional')]
        ),
        createAction('after'),
      ])

      executeEventHandler(handler, { flag: true }, executor)

      expect(executor).toHaveBeenCalledTimes(3)
      expect(executor).toHaveBeenNthCalledWith(1, { action: 'before', args: undefined }, undefined)
      expect(executor).toHaveBeenNthCalledWith(2, { action: 'conditional', args: undefined }, undefined)
      expect(executor).toHaveBeenNthCalledWith(3, { action: 'after', args: undefined }, undefined)
    })
  })

  describe('createClickHandler', () => {
    it('returns a function', () => {
      const handler = createClickHandler(undefined, vi.fn())
      expect(typeof handler).toBe('function')
    })

    it('does nothing when no onclick handler defined', () => {
      const executeHandler = vi.fn()
      const handler = createClickHandler([], executeHandler)
      const event = createMockMouseEvent()

      handler(event)

      expect(executeHandler).not.toHaveBeenCalled()
    })

    it('executes onclick handler when defined', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('onclick', [createAction('test')])
      const handler = createClickHandler([eventHandler], executeHandler)
      const event = createMockMouseEvent()

      handler(event)

      expect(executeHandler).toHaveBeenCalledWith(eventHandler, event)
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('calls onInspectClick and stops propagation in inspect mode', () => {
      const executeHandler = vi.fn()
      const onInspectClick = vi.fn()
      const handler = createClickHandler([], executeHandler, true, onInspectClick)
      const event = createMockMouseEvent()

      handler(event)

      expect(onInspectClick).toHaveBeenCalledWith(event)
      expect(event.stopPropagation).toHaveBeenCalled()
      expect(executeHandler).not.toHaveBeenCalled()
    })

    it('does not execute handler in inspect mode', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('onclick', [createAction('test')])
      const handler = createClickHandler([eventHandler], executeHandler, true)
      const event = createMockMouseEvent()

      handler(event)

      expect(executeHandler).not.toHaveBeenCalled()
    })

    it('ignores other event types', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('onhover', [createAction('test')])
      const handler = createClickHandler([eventHandler], executeHandler)
      const event = createMockMouseEvent()

      handler(event)

      expect(executeHandler).not.toHaveBeenCalled()
    })
  })

  describe('createMouseEnterHandler', () => {
    it('sets hovered state to true', () => {
      const setIsHovered = vi.fn()
      const handler = createMouseEnterHandler([], vi.fn(), setIsHovered)
      const event = createMockMouseEvent()

      handler(event)

      expect(setIsHovered).toHaveBeenCalledWith(true)
    })

    it('executes onhover handler', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('onhover', [createAction('hover')])
      const handler = createMouseEnterHandler([eventHandler], executeHandler, vi.fn())
      const event = createMockMouseEvent()

      handler(event)

      expect(executeHandler).toHaveBeenCalledWith(eventHandler, event)
    })

    it('calls onInspectHover in inspect mode', () => {
      const onInspectHover = vi.fn()
      const handler = createMouseEnterHandler([], vi.fn(), vi.fn(), true, onInspectHover)
      const event = createMockMouseEvent()

      handler(event)

      expect(onInspectHover).toHaveBeenCalled()
    })
  })

  describe('createMouseLeaveHandler', () => {
    it('sets hovered state to false', () => {
      const setIsHovered = vi.fn()
      const handler = createMouseLeaveHandler(setIsHovered)

      handler()

      expect(setIsHovered).toHaveBeenCalledWith(false)
    })

    it('calls onInspectLeave in inspect mode', () => {
      const onInspectLeave = vi.fn()
      const handler = createMouseLeaveHandler(vi.fn(), true, onInspectLeave)

      handler()

      expect(onInspectLeave).toHaveBeenCalled()
    })
  })

  describe('createChangeHandler', () => {
    it('returns a function', () => {
      const handler = createChangeHandler(undefined, vi.fn())
      expect(typeof handler).toBe('function')
    })

    it('executes onchange handler', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('onchange', [createAction('change')])
      const handler = createChangeHandler([eventHandler], executeHandler)
      const event = createMockChangeEvent()

      handler(event)

      expect(executeHandler).toHaveBeenCalledWith(eventHandler, event)
    })

    it('does nothing when no onchange handler', () => {
      const executeHandler = vi.fn()
      const handler = createChangeHandler([], executeHandler)
      const event = createMockChangeEvent()

      handler(event)

      expect(executeHandler).not.toHaveBeenCalled()
    })
  })

  describe('createInputHandler', () => {
    it('returns a function', () => {
      const handler = createInputHandler(undefined, vi.fn())
      expect(typeof handler).toBe('function')
    })

    it('executes oninput handler', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('oninput', [createAction('input')])
      const handler = createInputHandler([eventHandler], executeHandler)
      const event = createMockChangeEvent()

      handler(event)

      expect(executeHandler).toHaveBeenCalledWith(eventHandler, event)
    })

    it('does nothing when no oninput handler', () => {
      const executeHandler = vi.fn()
      const handler = createInputHandler([], executeHandler)
      const event = createMockChangeEvent()

      handler(event)

      expect(executeHandler).not.toHaveBeenCalled()
    })
  })

  describe('createFocusHandler', () => {
    it('returns a function', () => {
      const handler = createFocusHandler(undefined, vi.fn())
      expect(typeof handler).toBe('function')
    })

    it('executes onfocus handler', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('onfocus', [createAction('focus')])
      const handler = createFocusHandler([eventHandler], executeHandler)
      const event = createMockFocusEvent()

      handler(event)

      expect(executeHandler).toHaveBeenCalledWith(eventHandler, event)
    })

    it('does nothing when no onfocus handler', () => {
      const executeHandler = vi.fn()
      const handler = createFocusHandler([], executeHandler)
      const event = createMockFocusEvent()

      handler(event)

      expect(executeHandler).not.toHaveBeenCalled()
    })
  })

  describe('createBlurHandler', () => {
    it('returns a function', () => {
      const handler = createBlurHandler(undefined, vi.fn())
      expect(typeof handler).toBe('function')
    })

    it('executes onblur handler', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('onblur', [createAction('blur')])
      const handler = createBlurHandler([eventHandler], executeHandler)
      const event = createMockFocusEvent()

      handler(event)

      expect(executeHandler).toHaveBeenCalledWith(eventHandler, event)
    })

    it('does nothing when no onblur handler', () => {
      const executeHandler = vi.fn()
      const handler = createBlurHandler([], executeHandler)
      const event = createMockFocusEvent()

      handler(event)

      expect(executeHandler).not.toHaveBeenCalled()
    })
  })

  describe('createKeyDownHandler', () => {
    it('returns a function', () => {
      const handler = createKeyDownHandler(undefined, vi.fn())
      expect(typeof handler).toBe('function')
    })

    it('executes onkeydown handler', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('onkeydown', [createAction('keydown')])
      const handler = createKeyDownHandler([eventHandler], executeHandler)
      const event = createMockKeyboardEvent()

      handler(event)

      expect(executeHandler).toHaveBeenCalledWith(eventHandler, event)
    })

    it('does nothing when no onkeydown handler', () => {
      const executeHandler = vi.fn()
      const handler = createKeyDownHandler([], executeHandler)
      const event = createMockKeyboardEvent()

      handler(event)

      expect(executeHandler).not.toHaveBeenCalled()
    })
  })

  describe('createKeyUpHandler', () => {
    it('returns a function', () => {
      const handler = createKeyUpHandler(undefined, vi.fn())
      expect(typeof handler).toBe('function')
    })

    it('executes onkeyup handler', () => {
      const executeHandler = vi.fn()
      const eventHandler = createEventHandler('onkeyup', [createAction('keyup')])
      const handler = createKeyUpHandler([eventHandler], executeHandler)
      const event = createMockKeyboardEvent()

      handler(event)

      expect(executeHandler).toHaveBeenCalledWith(eventHandler, event)
    })

    it('does nothing when no onkeyup handler', () => {
      const executeHandler = vi.fn()
      const handler = createKeyUpHandler([], executeHandler)
      const event = createMockKeyboardEvent()

      handler(event)

      expect(executeHandler).not.toHaveBeenCalled()
    })
  })
})
