/**
 * DOMGenerator ops — emit-state
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

export function mapKeyNameMethod(this: DOMGenerator, key: string): string {
  return mapKeyName(key)
}

export function emitStateMachine(this: DOMGenerator, varName: string, node: IRNode): void {
  emitStateMachineExtracted(this.createStateMachineContext(), varName, node)
}

export function emitDeferredWhenWatchersMethod(this: DOMGenerator): void {
  emitDeferredWhenWatchers(this.createStateMachineContext(), this.deferredWhenWatchers)
}

export function groupByState(this: DOMGenerator, styles: IRStyle[]): Record<string, IRStyle[]> {
  const result: Record<string, IRStyle[]> = {}
  for (const style of styles) {
    const state = style.state || 'default'
    if (!result[state]) result[state] = []
    result[state].push(style)
  }
  return result
}

export function collectNamedNodes(this: DOMGenerator, nodes: IRNode[]): IRNode[] {
  return collectNamedNodesExtracted(nodes)
}
