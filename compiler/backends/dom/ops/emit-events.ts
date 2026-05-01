/**
 * DOMGenerator ops — emit-events
 *
 * Extracted from compiler/backends/dom.ts. Functions take `this: DOMGenerator`
 * and are bound on the class via class-field assignment.
 */

import type { IREvent, IRAction } from '../../../ir/types'
import {
  emitEventListener as emitEventListenerExtracted,
  emitTemplateEventListener as emitTemplateEventListenerExtracted,
  emitAction as emitActionExtracted,
} from '../../dom/event-emitter'
import type { DOMGenerator } from '../../dom'

export function emitTemplateEventListener(
  this: DOMGenerator,
  varName: string,
  event: IREvent,
  itemVar: string
): void {
  const ctx = this.createEventEmitterContext()
  emitTemplateEventListenerExtracted(ctx, varName, event, itemVar, (action, currentVar, item) =>
    this.emitTemplateAction(action, currentVar, item)
  )
}

export function emitTemplateAction(
  this: DOMGenerator,
  action: IRAction,
  currentVar: string,
  itemVar: string
): void {
  const target = action.target || 'self'

  switch (action.type) {
    case 'toggle':
      this.emit(`_runtime.toggle(_elements['${target}'] || ${currentVar})`)
      break
    case 'select':
      this.emit(`_runtime.select(${currentVar})`)
      break
    case 'exclusive':
      // Exclusive selection - deselect siblings, select this one
      this.emit(`_runtime.exclusive(${currentVar})`)
      break
    case 'assign':
      // Handle assign $selected to $item
      if (action.args && action.args[0] === `$${itemVar}`) {
        const stateVar = target.startsWith('$') ? target.slice(1) : target
        this.emit(`_state['${stateVar}'] = ${itemVar}`)
        this.emit(`api.update()`)
      }
      break
    default:
      // For unrecognized actions in template context, try emitting as regular action
      // This handles custom functions and other action types
      this.emitAction(action, currentVar)
  }
}

/**
 * Emit standard event listener
 * Delegates to extracted event-emitter.ts
 */
export function emitEventListener(this: DOMGenerator, varName: string, event: IREvent): void {
  const ctx = this.createEventEmitterContext()
  emitEventListenerExtracted(ctx, varName, event, (action, currentVar) =>
    this.emitAction(action, currentVar)
  )
}

/**
 * Emit action call
 * Delegates to extracted event-emitter.ts
 */
export function emitAction(this: DOMGenerator, action: IRAction, currentVar: string): void {
  const ctx = this.createEventEmitterContext()
  emitActionExtracted(ctx, action, currentVar)
}
