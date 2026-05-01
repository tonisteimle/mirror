/**
 * IRTransformer ops — text-node-builder
 *
 * Extracted from compiler/ir/index.ts. Functions take `this: IRTransformer`
 * and are bound on the class via class-field assignment.
 */

import type {
  AST,
  CanvasDefinition,
  ComponentDefinition,
  Instance,
  Property,
  State,
  Event,
  Action,
  Each,
  Slot,
  Text,
  ChildOverride,
  AnimationDefinition,
  AnimationKeyframe,
  AnimationKeyframeProperty,
  ZagNode,
  ZagSlotDef,
  ZagItem,
  DataAttribute,
  DataReference,
  DataReferenceArray,
  TokenReference,
  LoopVarReference,
  Conditional as ASTConditional,
  ComputedExpression,
  IconDefinition,
} from '../../parser/ast'
import { logIR as log } from '../../utils/logger'
import {
  isComponent,
  isInstance,
  isZagComponent,
  isSlot,
  isText,
  isEach,
  hasContent,
} from '../../parser/ast'
import type {
  IR,
  IRCanvas,
  IRNode,
  IRStyle,
  IREvent,
  IRAction,
  IRProperty,
  IREach,
  IRConditional,
  SourcePosition,
  PropertySourceMap,
  IRAnimation,
  IRAnimationKeyframe,
  IRAnimationProperty,
  IRWarning,
  LayoutType,
  IRSlot,
  IRItem,
  IRItemProperty,
  IRZagNode,
  IRStateMachine,
  IRStateDefinition,
  IRStateTransition,
  IRToken,
  IRDataObject,
  IRDataValue,
  IRDataReference,
  IRDataReferenceArray,
} from '../types'
import { SourceMap, SourceMapBuilder, calculateSourcePosition } from '../source-map'
import { getPrimitiveDefaults, type DefaultProperty } from '../../schema/primitives'
import {
  schemaPropertyToCSS,
  simplePropertyToCSS,
  PROPERTY_TO_CSS,
  NON_CSS_PROPERTIES,
  ALIGNMENT_PROPERTIES,
  DIRECTION_PROPERTIES,
  DIRECTION_MAP,
  CORNER_MAP,
  BORDER_DIRECTION_MAP,
  PROPERTY_TO_TOKEN_SUFFIX,
  hoverPropertyToCSS,
  mapEventToDom,
  getHtmlTag,
} from '../../schema/ir-helpers'
import { findProperty, getEvent, getAction, getState, DSL, getDevicePreset } from '../../schema/dsl'
import { isZagPrimitive, ZAG_PRIMITIVES } from '../../schema/zag-primitives'
import {
  isChartPrimitive,
  getChartPrimitive,
  getChartSlotProperty,
} from '../../schema/chart-primitives'
import { isContainer as isContainerPrimitive, FLEX_DEFAULTS } from '../../schema/layout-defaults'
import type { IRChartSlot } from '../types'
import { getCanonicalPropertyName, SYSTEM_STATES } from '../../schema/parser-helpers'
import { transformChart as transformChartExtracted } from '../transformers/chart-transformer'
import { transformZagComponent as transformZagComponentExtracted } from '../transformers/zag-transformer'
import type { TransformerContext, ParentLayoutContext } from '../transformers/transformer-context'
import {
  type LayoutContext,
  createLayoutContext,
  resolveGridColumns,
  applyAlignmentsToContext,
  generateLayoutStyles,
  applyAbsolutePositioningToChildren,
  applyGridContextToChildren,
} from '../transformers/layout-transformer'
import {
  transformDataAttributes,
  transformDataValue,
  transformAnimation,
  convertStateDependency,
  convertStateAnimation,
} from '../transformers/data-transformer'
import {
  BUILTIN_STATE_FUNCTIONS,
  transformEvents,
  transformAction,
} from '../transformers/event-transformer'
import {
  formatCSSValue,
  parseDirectionalSpacing,
  formatBorderValue,
  booleanPropertyToCSS,
} from '../transformers/style-utils-transformer'
import {
  convertDefaultsToProperties,
  determineLayoutType,
  mergeProperties,
  extractValueBinding,
} from '../transformers/property-utils-transformer'
import { type ExpressionPart, buildExpressionString } from '../transformers/expression-transformer'
import {
  propertyToCSS as propertyToCSSExtracted,
  type PropertyTransformContext,
  type TransformAccumulator,
} from '../transformers/property-transformer'
import {
  buildStateMachine as buildStateMachineExtracted,
  type StateMachineTransformContext,
} from '../transformers/state-machine-transformer'
import {
  resolveValue as resolveValueExtracted,
  resolveContentValue as resolveContentValueExtracted,
  resolveTokenWithContext as resolveTokenWithContextExtracted,
  extractHTMLProperties as extractHTMLPropertiesExtracted,
} from '../transformers/value-resolver'
import {
  mergeStates as mergeStatesExtracted,
  resolveComponent as resolveComponentExtracted,
  type ComponentResolverContext,
} from '../transformers/component-resolver'
import {
  childOverridesToInstances as childOverridesToInstancesExtracted,
  mergeSlotPropertiesIntoFiller as mergeSlotPropertiesIntoFillerExtracted,
} from '../transformers/slot-utils'
import { fixLoopVariableReferences as fixLoopVariableReferencesExtracted } from '../transformers/loop-utils'
import {
  transformStates as transformStatesExtracted,
  applyStateChildOverrides as applyStateChildOverridesExtracted,
  type StateStylesContext,
  type StateTransformResult,
} from '../transformers/state-styles-transformer'
import {
  extractInlineStatesAndEvents as extractInlineStatesAndEventsExtracted,
  type InlineExtractionContext,
} from '../transformers/inline-extraction'
import {
  transformEach as transformEachExtracted,
  transformConditional as transformConditionalExtracted,
  type ConditionalBlock,
  type ControlFlowContext,
} from '../transformers/control-flow-transformer'
import {
  validateProperty as validatePropertyExtracted,
  isKnownProperty as isKnownPropertyExtracted,
  addWarning as addWarningExtracted,
  type ValidationContext,
} from '../transformers/validation'
import { expandPropertySets as expandPropertySetsExtracted } from '../transformers/property-set-expander'
import {
  transformStateChild as transformStateChildExtracted,
  type StateChildContext,
} from '../transformers/state-child-transformer'
import * as instance_ops from '../ops/instance-ops'
import * as children_resolver from '../ops/children-resolver'
import * as zag_instance_builder from '../ops/zag-instance-builder'
import * as properties_ops from '../ops/properties-ops'
import * as text_node_builder from '../ops/text-node-builder'
import * as state_builder from '../ops/state-builder'
import type { IRTransformer } from '../index'

export function createTextNode(this: IRTransformer, text: Text): IRNode {
  const nodeId = this.generateId()
  return {
    id: nodeId,
    tag: 'span',
    primitive: 'text',
    properties: [{ name: 'content', value: text.content }],
    styles: [],
    events: [],
    children: [],
  }
}
