/**
 * Event Handlers Module
 *
 * Factory functions for creating React event handlers
 * from DSL event definitions.
 */

import type React from 'react'
import type { EventHandler, ActionStatement, Conditional } from '../../parser/parser'
import { evaluateCondition } from '../utils'

/**
 * Type for the action executor function.
 */
export type ActionExecutor = (action: ActionStatement, event?: React.SyntheticEvent) => void

/**
 * Execute a handler's actions with conditional support.
 */
export function executeEventHandler(
  handler: EventHandler,
  variables: Record<string, unknown>,
  executeAction: ActionExecutor,
  event?: React.SyntheticEvent
): void {
  for (const actionOrConditional of handler.actions) {
    if ('condition' in actionOrConditional) {
      const cond = actionOrConditional as Conditional
      if (evaluateCondition(cond.condition, variables)) {
        for (const action of cond.thenActions) {
          executeAction(action, event)
        }
      } else if (cond.elseActions) {
        for (const action of cond.elseActions) {
          executeAction(action, event)
        }
      }
    } else {
      executeAction(actionOrConditional as ActionStatement, event)
    }
  }
}

/**
 * Create click handler.
 */
export function createClickHandler(
  eventHandlers: EventHandler[] | undefined,
  executeHandler: (handler: EventHandler, event?: React.SyntheticEvent) => void,
  inspectMode?: boolean,
  onInspectClick?: (e: React.MouseEvent) => void
): (e: React.MouseEvent) => void {
  return (e: React.MouseEvent) => {
    if (inspectMode) {
      e.stopPropagation()
      onInspectClick?.(e)
      return
    }
    const handler = eventHandlers?.find(h => h.event === 'onclick')
    if (handler) {
      e.stopPropagation()
      executeHandler(handler, e)
    }
  }
}

/**
 * Create mouse enter handler.
 */
export function createMouseEnterHandler(
  eventHandlers: EventHandler[] | undefined,
  executeHandler: (handler: EventHandler, event?: React.SyntheticEvent) => void,
  setIsHovered: (hovered: boolean) => void,
  inspectMode?: boolean,
  onInspectHover?: () => void
): (e: React.MouseEvent) => void {
  return (e: React.MouseEvent) => {
    setIsHovered(true)
    if (inspectMode) onInspectHover?.()
    const handler = eventHandlers?.find(h => h.event === 'onhover')
    if (handler) executeHandler(handler, e)
  }
}

/**
 * Create mouse leave handler.
 */
export function createMouseLeaveHandler(
  setIsHovered: (hovered: boolean) => void,
  inspectMode?: boolean,
  onInspectLeave?: () => void
): () => void {
  return () => {
    setIsHovered(false)
    if (inspectMode) onInspectLeave?.()
  }
}

/**
 * Create change handler.
 */
export function createChangeHandler(
  eventHandlers: EventHandler[] | undefined,
  executeHandler: (handler: EventHandler, event?: React.SyntheticEvent) => void
): (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void {
  return (e) => {
    const handler = eventHandlers?.find(h => h.event === 'onchange')
    if (handler) executeHandler(handler, e)
  }
}

/**
 * Create input handler.
 */
export function createInputHandler(
  eventHandlers: EventHandler[] | undefined,
  executeHandler: (handler: EventHandler, event?: React.SyntheticEvent) => void
): (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
  return (e) => {
    const handler = eventHandlers?.find(h => h.event === 'oninput')
    if (handler) executeHandler(handler, e)
  }
}

/**
 * Create focus handler.
 */
export function createFocusHandler(
  eventHandlers: EventHandler[] | undefined,
  executeHandler: (handler: EventHandler, event?: React.SyntheticEvent) => void
): (e: React.FocusEvent) => void {
  return (e) => {
    const handler = eventHandlers?.find(h => h.event === 'onfocus')
    if (handler) executeHandler(handler, e)
  }
}

/**
 * Create blur handler.
 */
export function createBlurHandler(
  eventHandlers: EventHandler[] | undefined,
  executeHandler: (handler: EventHandler, event?: React.SyntheticEvent) => void
): (e: React.FocusEvent) => void {
  return (e) => {
    const handler = eventHandlers?.find(h => h.event === 'onblur')
    if (handler) executeHandler(handler, e)
  }
}

/**
 * Create key down handler.
 */
export function createKeyDownHandler(
  eventHandlers: EventHandler[] | undefined,
  executeHandler: (handler: EventHandler, event?: React.SyntheticEvent) => void
): (e: React.KeyboardEvent) => void {
  return (e) => {
    const handler = eventHandlers?.find(h => h.event === 'onkeydown')
    if (handler) executeHandler(handler, e)
  }
}

/**
 * Create key up handler.
 */
export function createKeyUpHandler(
  eventHandlers: EventHandler[] | undefined,
  executeHandler: (handler: EventHandler, event?: React.SyntheticEvent) => void
): (e: React.KeyboardEvent) => void {
  return (e) => {
    const handler = eventHandlers?.find(h => h.event === 'onkeyup')
    if (handler) executeHandler(handler, e)
  }
}
