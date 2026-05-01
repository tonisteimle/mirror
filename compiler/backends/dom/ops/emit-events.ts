/**
 * DOMGenerator ops — emit-events
 *
 * Extracted from compiler/backends/dom.ts. Functions take `this: DOMGenerator`
 * and are bound on the class via class-field assignment.
 */

import type { AST, JavaScriptBlock, TokenDefinition } from '../../../parser/ast'
import { toIR } from '../../../ir'
import type {
  IR,
  IRCanvas,
  IRNode,
  IRStyle,
  IREvent,
  IRAction,
  IREach,
  IRConditional,
  IRAnimation,
  IRZagNode,
  IRStateMachine,
  IRStateTransition,
  IRItem,
  IRProperty,
  IRSlot,
  IRItemProperty,
} from '../../../ir/types'
import { isIRZagNode } from '../../../ir/types'
import { DOM_RUNTIME_CODE } from '../../dom/runtime-template'
import type { DataFile } from '../../../parser/data-types'
import { dispatchZagEmitter } from '../../dom/zag-emitters'
import type { ZagEmitterContext } from '../../dom/base-emitter-context'
import { escapeJSString, cssPropertyToJS, generateVarName } from '../../dom/utils'
import { ZAG_SLOT_NAMES, type GenerateDOMOptions } from '../../dom/types'
import type { EmitterContext, DeferredWhenWatcher } from '../../dom/base-emitter-context'
import {
  emitStateMachine as emitStateMachineExtracted,
  emitDeferredWhenWatchers,
} from '../../dom/state-machine-emitter'
import type { StateMachineEmitterContext } from '../../dom/state-machine-emitter'
import {
  emitEachLoop as emitEachLoopExtracted,
  emitConditional as emitConditionalExtracted,
} from '../../dom/loop-emitter'
import type { LoopEmitterContext } from '../../dom/loop-emitter'
import {
  emitEventListener as emitEventListenerExtracted,
  emitTemplateEventListener as emitTemplateEventListenerExtracted,
  emitAction as emitActionExtracted,
  mapKeyName,
} from '../../dom/event-emitter'
import type { EventEmitterContext } from '../../dom/event-emitter'
import { emitTokens as emitTokensExtracted } from '../../dom/token-emitter'
import type { TokenEmitterContext } from '../../dom/token-emitter'
import { emitAnimations as emitAnimationsExtracted } from '../../dom/animation-emitter'
import type { AnimationEmitterContext } from '../../dom/animation-emitter'
import {
  emitElementCreation,
  emitProperties,
  emitIconSetup,
  emitSlotSetup,
  emitBaseStyles,
  emitContainerType,
  emitLayoutType,
  emitStateStyles,
  emitVisibleWhen,
  emitSelectionBinding,
  emitBindAttribute,
  emitComponentAttributes,
  emitRouteAttribute,
  emitKeyboardNav,
  emitLoopFocus,
  emitTypeahead,
  emitTriggerText,
  emitMask,
  emitValueBinding,
  emitAbsolutePositioning,
  emitAbsContainerMarker,
  emitAppendToParent,
} from '../../dom/node-emitter'
import type { NodeEmitterContext } from '../../dom/node-emitter'
import {
  collectNamedNodes as collectNamedNodesExtracted,
  emitPublicAPI as emitPublicAPIExtracted,
  emitInitialization as emitInitializationExtracted,
  emitAutoMount as emitAutoMountExtracted,
} from '../../dom/api-emitter'
import type { APIEmitterContext } from '../../dom/api-emitter'
import { emitChartSetup } from '../../dom/chart-emitter'
import type { ChartEmitterContext } from '../../dom/chart-emitter'
import { emitStyles as emitStylesExtracted } from '../../dom/style-emitter'
import type { StyleEmitterContext } from '../../dom/style-emitter'
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
