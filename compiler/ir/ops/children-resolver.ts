/**
 * IRTransformer ops — children-resolver
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

export function resolveChildren(
  this: IRTransformer,
  componentChildren: (Instance | Slot)[],
  instanceChildren: (Instance | Text | Slot)[],
  parentId?: string,
  parentLayoutContext?: ParentLayoutContext
): IRNode[] {
  // If no component children (no slot definitions), just transform instance children directly
  // This preserves the original order for simple containers like Box with mixed children
  if (componentChildren.length === 0) {
    return instanceChildren.map(child => this.transformChild(child, parentId, parentLayoutContext))
  }

  // Build map of instance children by component name (slot fillers)
  const slotFillers = new Map<string, (Instance | Text)[]>()
  const nonSlotChildren: (Instance | Text)[] = []

  for (const child of instanceChildren) {
    if (isInstance(child)) {
      if (!slotFillers.has(child.component)) {
        slotFillers.set(child.component, [])
      }
      slotFillers.get(child.component)!.push(child)
    } else if (isComponent(child)) {
      // Skip Component children - they are template definitions, not actual content
      // They will be processed when we iterate componentChildren
      continue
    } else {
      // Text or other non-slot children
      nonSlotChildren.push(child as Instance | Text)
    }
  }

  const result: IRNode[] = []

  // Identify which Component children are template definitions vs fillable slots
  // If a Component has sibling Instances using it, it's a template (not a slot)
  const templateNames = new Set<string>()
  for (const child of instanceChildren) {
    if (isInstance(child)) {
      templateNames.add(child.component)
    }
  }

  // Build a map of slot definitions by name for quick lookup
  const slotDefsByName = new Map<string, Instance | ComponentDefinition | Slot>()
  for (const slot of componentChildren) {
    if (isInstance(slot)) {
      slotDefsByName.set((slot as Instance).component, slot)
    } else if (isComponent(slot)) {
      slotDefsByName.set((slot as ComponentDefinition).name, slot)
    } else if (isSlot(slot)) {
      slotDefsByName.set((slot as Slot).name, slot)
    }
  }

  // Track which slots have been processed (to handle unused slots at the end)
  const processedSlots = new Set<string>()

  // FIRST: Process instance children in their ORDER (user's intended order)
  // This ensures Icon comes before Title if user wrote Icon first
  for (const instanceChild of instanceChildren) {
    if (!isInstance(instanceChild)) continue

    const childName = instanceChild.component
    const slotDef = slotDefsByName.get(childName)

    if (slotDef && !processedSlots.has(childName)) {
      // This instance child fills a slot - use slot's properties merged with instance
      const slotIsInstance = isInstance(slotDef)
      const slotIsComponent = isComponent(slotDef)

      let slotVisibleWhen: string | undefined
      let slotInitialState: string | undefined
      let slotProperties: Property[] = []

      if (slotIsInstance) {
        const instSlot = slotDef as Instance
        slotVisibleWhen = instSlot.visibleWhen
        slotInitialState = instSlot.initialState
        slotProperties = instSlot.properties || []
      } else if (slotIsComponent) {
        const compSlot = slotDef as ComponentDefinition
        slotVisibleWhen = compSlot.visibleWhen
        slotInitialState = compSlot.initialState
        slotProperties = compSlot.properties || []
      } else if (isSlot(slotDef)) {
        const slotObj = slotDef as Slot
        slotProperties = slotObj.properties || []
      }

      // Skip templates (definitions with sibling instances using them)
      if (slotIsComponent && templateNames.has(childName)) {
        continue
      }

      // Sub-slot definitions: if this slot defines its own slots (Footer
      // with Status:, Action: as children), collect their names so we can
      // mark matching children of the filler as isSlotFiller too.
      const subSlotNames = new Set<string>()
      const slotDefChildren = (slotDef as Instance | ComponentDefinition).children || []
      for (const subSlot of slotDefChildren) {
        if (isInstance(subSlot)) subSlotNames.add((subSlot as Instance).component)
        else if (isComponent(subSlot)) subSlotNames.add((subSlot as ComponentDefinition).name)
      }

      // Process ALL instances for this slot (there may be multiple)
      const fillers = slotFillers.get(childName) || []
      for (const filler of fillers) {
        const mergedFiller = mergeSlotPropertiesIntoFillerExtracted(filler, slotProperties)
        const node = this.transformChild(mergedFiller, parentId, parentLayoutContext)
        if (slotVisibleWhen && !node.visibleWhen) {
          node.visibleWhen = slotVisibleWhen
        }
        if (slotInitialState && !node.initialState) {
          node.initialState = slotInitialState
        }
        node.isSlotFiller = true
        // Mark sub-slot fillers based on the slot-def's child slots
        if (subSlotNames.size > 0) {
          for (const child of node.children) {
            if (child.name && subSlotNames.has(child.name)) {
              child.isSlotFiller = true
            }
          }
        }
        result.push(node)
      }

      processedSlots.add(childName)
      slotFillers.delete(childName)
    }
  }

  // SECOND: Process remaining slot definitions that weren't filled (defaults)
  // These keep their definition order since user didn't specify an order
  if (componentChildren.length > 0) {
    for (const slot of componentChildren) {
      // Handle both Instance slots (Title:) and Component slots (Title as frame:)
      const slotIsInstance = isInstance(slot)
      const slotIsComponent = isComponent(slot)

      if (slotIsInstance || slotIsComponent) {
        // Explicitly narrow the types for TypeScript
        let slotName: string
        let slotVisibleWhen: string | undefined
        let slotInitialState: string | undefined
        let slotProperties: Property[] = []

        if (slotIsInstance) {
          const instSlot = slot as Instance
          slotName = instSlot.component
          slotVisibleWhen = instSlot.visibleWhen
          slotInitialState = instSlot.initialState
          slotProperties = instSlot.properties || []
        } else {
          const compSlot = slot as ComponentDefinition
          slotName = compSlot.name
          slotVisibleWhen = compSlot.visibleWhen
          slotInitialState = compSlot.initialState
          slotProperties = compSlot.properties || []
        }

        // Skip Component definitions that are templates (have sibling instances using them)
        if (slotIsComponent && templateNames.has(slotName)) {
          // This is a template definition, not a fillable slot - skip it
          // The instances using this template will be processed below
          continue
        }

        // Skip slots already processed in the first pass (user's order)
        if (processedSlots.has(slotName)) {
          continue
        }

        // Check if instance provided content for this slot
        const fillers = slotFillers.get(slotName)
        if (fillers && fillers.length > 0) {
          // Use instance's content instead of slot default
          // Inherit styles and visibility conditions from slot definition
          for (const filler of fillers) {
            // Merge slot properties with filler properties (filler wins on conflict)
            const mergedFiller = mergeSlotPropertiesIntoFillerExtracted(filler, slotProperties)
            const node = this.transformChild(mergedFiller, parentId, parentLayoutContext)
            // Transfer slot's visibleWhen to filler if slot has one
            if (slotVisibleWhen && !node.visibleWhen) {
              node.visibleWhen = slotVisibleWhen
            }
            if (slotInitialState && !node.initialState) {
              node.initialState = slotInitialState
            }
            node.isSlotFiller = true
            result.push(node)
          }
          // Mark as used
          slotFillers.delete(slotName)
        } else {
          // Use slot's default content (the slot definition itself)
          // For Component type, create an instance-like object
          if (slotIsComponent) {
            const compSlot = slot as ComponentDefinition
            const pseudoInstance: Instance = {
              type: 'Instance',
              component: compSlot.name,
              name: null,
              properties: compSlot.properties,
              // Don't pass children here - they come from the component definition
              // via resolveChildren's componentChildren parameter
              children: [],
              line: compSlot.line,
              column: compSlot.column,
              visibleWhen: slotVisibleWhen,
              initialState: slotInitialState,
            }
            const node = this.transformInstance(
              pseudoInstance,
              parentId,
              false,
              false,
              parentLayoutContext
            )
            node.isSlotFiller = true
            result.push(node)
          } else if (slotIsInstance) {
            const node = this.transformInstance(
              slot as Instance,
              parentId,
              false,
              false,
              parentLayoutContext
            )
            node.isSlotFiller = true
            result.push(node)
          }
        }
      } else if (isSlot(slot)) {
        // Named slot placeholder - check for filler
        const slotObj = slot as Slot

        // Skip slots already processed in the first pass (user's order)
        if (processedSlots.has(slotObj.name)) {
          continue
        }

        const fillers = slotFillers.get(slotObj.name)
        if (fillers && fillers.length > 0) {
          for (const filler of fillers) {
            // Merge slot properties into filler (slot provides defaults)
            const mergedFiller = mergeSlotPropertiesIntoFillerExtracted(
              filler,
              slotObj.properties || []
            )
            result.push(this.transformChild(mergedFiller, parentId, parentLayoutContext))
          }
          slotFillers.delete(slotObj.name)
        } else {
          // No filler - render slot as visual placeholder
          result.push(this.transformSlotPrimitive(slotObj, parentId))
        }
      }
    }
  }

  // Add remaining instance children that didn't match any slot
  // (these are additional children, not slot fillers)
  for (const [_name, fillers] of slotFillers) {
    for (const filler of fillers) {
      result.push(this.transformChild(filler, parentId, parentLayoutContext))
    }
  }

  // Add non-slot children (text nodes)
  for (const child of nonSlotChildren) {
    result.push(this.transformChild(child, parentId, parentLayoutContext))
  }

  return result
}
