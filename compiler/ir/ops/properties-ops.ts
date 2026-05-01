/**
 * IRTransformer ops — properties-ops
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

export function validateProperty(
  this: IRTransformer,
  propName: string,
  position?: SourcePosition
): boolean {
  return validatePropertyExtracted(propName, { warnings: this.warnings }, position)
}

/**
 * Check if a property is known (without emitting warnings)
 */
export function isKnownProperty(this: IRTransformer, propName: string): boolean {
  return isKnownPropertyExtracted(propName)
}

/**
 * Get HTML tag for component
 * Uses schema-based mapping from ir-helpers
 */
export function getTag(
  this: IRTransformer,
  componentName: string,
  resolved: ComponentDefinition | null
): string {
  const primitive = resolved?.primitive || componentName.toLowerCase()
  return getHtmlTag(primitive)
}

/**
 * Expand property sets and component style mixins in a list of properties.
 * Delegates to extracted property-set-expander.ts
 */
export function expandPropertySets(this: IRTransformer, properties: Property[]): Property[] {
  return expandPropertySetsExtracted(properties, this.propertySetMap, this.componentMap)
}

/**
 * Transform Mirror properties to CSS styles
 *
 * This method uses intelligent layout merging to handle flexbox properties correctly.
 * It collects all layout-related properties first, then generates consistent CSS.
 * It also collects transform properties to combine them into a single transform value.
 */
export function transformProperties(
  this: IRTransformer,
  properties: Property[],
  primitive: string = 'frame',
  parentLayoutContext?: ParentLayoutContext,
  childrenInfo?: { hasWidthFull?: boolean }
): IRStyle[] {
  // First, expand any property set references
  const expandedProperties = this.expandPropertySets(properties)

  // Find and expand device property - replace IN PLACE so that explicit w/h after device still wins.
  // Preset values come from schema (getDevicePreset).
  const deviceIndex = expandedProperties.findIndex(p => p.name === 'device')
  if (deviceIndex !== -1) {
    const deviceProp = expandedProperties[deviceIndex]
    if (deviceProp.values[0]) {
      const preset = getDevicePreset(String(deviceProp.values[0]))
      if (preset) {
        // Replace device property with w/h at the same position
        // This ensures "device mobile, w 400" results in w being 400 (last wins)
        const wProp: Property = {
          type: 'Property',
          name: 'w',
          values: [preset.width],
          line: deviceProp.line,
          column: deviceProp.column,
        }
        const hProp: Property = {
          type: 'Property',
          name: 'h',
          values: [preset.height],
          line: deviceProp.line,
          column: deviceProp.column,
        }
        expandedProperties.splice(deviceIndex, 1, wProp, hProp)
      }
    }
  }

  const styles: IRStyle[] = []
  const layoutContext = createLayoutContext()

  // Transform context to combine multiple transforms
  const transformContext: { transforms: string[] } = { transforms: [] }

  // Check for explicit min/max width/height properties
  // These should NOT be overwritten by automatic min-width: 0 from w full
  const hasExplicitMinWidth = expandedProperties.some(
    p => p.name === 'minw' || p.name === 'min-width'
  )
  const hasExplicitMinHeight = expandedProperties.some(
    p => p.name === 'minh' || p.name === 'min-height'
  )
  const hasExplicitMaxWidth = expandedProperties.some(
    p => p.name === 'maxw' || p.name === 'max-width'
  )
  const hasExplicitMaxHeight = expandedProperties.some(
    p => p.name === 'maxh' || p.name === 'max-height'
  )

  // Check for explicit width/height properties (for hug-by-default behavior)
  // When no width is set, containers should hug their content (fit-content)
  const hasExplicitWidth = expandedProperties.some(
    p => p.name === 'w' || p.name === 'width' || p.name === 'size'
  )
  const hasExplicitHeight = expandedProperties.some(
    p => p.name === 'h' || p.name === 'height' || p.name === 'size'
  )
  layoutContext.hasExplicitWidth = hasExplicitWidth
  layoutContext.hasExplicitHeight = hasExplicitHeight

  // If children have w full, parent should NOT use fit-content
  if (childrenInfo?.hasWidthFull) {
    layoutContext.childHasWidthFull = true
  }

  // Collect layout values to process together (preserving order for "last wins")
  // This includes both direction (hor/ver) and alignment (9-zone, center, etc.)
  const layoutValues: string[] = []

  // First pass: collect layout properties into context
  for (const prop of expandedProperties) {
    const name = prop.name
    // Boolean property: either [true] or [] (empty values)
    const isBoolean =
      (prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0

    // Direction properties - collect for order-aware processing
    if ((name === 'horizontal' || name === 'hor') && isBoolean) {
      layoutValues.push(name)
      continue
    }
    if ((name === 'vertical' || name === 'ver') && isBoolean) {
      layoutValues.push(name)
      continue
    }

    // Alignment properties - collect for context-aware processing
    if (ALIGNMENT_PROPERTIES.has(name) && isBoolean) {
      layoutValues.push(name)
      continue
    }

    // align property with values: align top left, align center
    if (name === 'align' && !isBoolean) {
      for (const val of prop.values) {
        const alignValue = String(val).toLowerCase()
        if (ALIGNMENT_PROPERTIES.has(alignValue)) {
          layoutValues.push(alignValue)
        }
      }
      continue
    }

    // Wrap
    if (name === 'wrap' && isBoolean) {
      layoutContext.flexWrap = 'wrap'
      continue
    }

    // Gap
    if ((name === 'gap' || name === 'g') && !isBoolean) {
      layoutContext.gap = formatCSSValue(
        name,
        resolveValueExtracted(prop.values, this.tokenSet, name)
      )
      continue
    }

    // Grid (takes precedence over flex)
    if (name === 'grid') {
      layoutContext.isGrid = true
      layoutContext.gridColumns = resolveGridColumns(prop)
      continue
    }

    // Dense (grid auto-flow dense)
    if (name === 'dense' && isBoolean) {
      // Will be combined with hor/ver direction in generateLayoutStyles
      if (layoutContext.gridAutoFlow) {
        layoutContext.gridAutoFlow = layoutContext.gridAutoFlow + ' dense'
      } else {
        layoutContext.gridAutoFlow = 'dense'
      }
      continue
    }

    // Gap-x (column-gap)
    if ((name === 'gap-x' || name === 'gx') && !isBoolean) {
      layoutContext.columnGap = formatCSSValue(
        name,
        resolveValueExtracted(prop.values, this.tokenSet, name)
      )
      continue
    }

    // Gap-y (row-gap)
    if ((name === 'gap-y' || name === 'gy') && !isBoolean) {
      layoutContext.rowGap = formatCSSValue(
        name,
        resolveValueExtracted(prop.values, this.tokenSet, name)
      )
      continue
    }

    // Row-height (grid-auto-rows) - only handle in grid context
    // Otherwise let it fall through to schema-based handling
    if ((name === 'row-height' || name === 'rh') && !isBoolean && layoutContext.isGrid) {
      layoutContext.rowHeight = formatCSSValue(
        name,
        resolveValueExtracted(prop.values, this.tokenSet, name)
      )
      continue
    }

    // Collect transform properties (rotate, scale, translate)
    if (name === 'rotate' || name === 'rot') {
      const deg = String(prop.values[0])
      transformContext.transforms.push(`rotate(${deg}deg)`)
      continue
    }
    if (name === 'scale') {
      const val = String(prop.values[0])
      transformContext.transforms.push(`scale(${val})`)
      continue
    }
  }

  // Apply collected layout values with order-awareness (last wins)
  applyAlignmentsToContext(layoutValues, layoutContext)

  // Generate layout styles from context (using extracted function)
  const layoutStyles = generateLayoutStyles(layoutContext, primitive)
  styles.push(...layoutStyles)

  // Second pass: process non-layout properties
  // Transform emission moved to AFTER this pass so properties can add to transformContext
  for (const prop of expandedProperties) {
    const name = prop.name
    const isBoolean =
      (prop.values.length === 1 && prop.values[0] === true) || prop.values.length === 0

    // Skip layout properties (already handled)
    if (DIRECTION_PROPERTIES.has(name) && isBoolean) continue
    if (ALIGNMENT_PROPERTIES.has(name) && isBoolean) continue
    if (name === 'align' && !isBoolean) continue // align top left → flex alignment
    if (name === 'wrap' && isBoolean) continue
    if ((name === 'gap' || name === 'g') && !isBoolean) continue
    if (name === 'grid') continue
    if (name === 'dense' && isBoolean) continue
    if ((name === 'gap-x' || name === 'gx') && !isBoolean) continue
    if ((name === 'gap-y' || name === 'gy') && !isBoolean) continue
    // Note: row-height is NOT skipped here - it will be handled by propertyToCSS via schema
    // In grid context, generateLayoutStyles handles it; outside grid, schema handles it

    // Skip transform properties (already handled in first pass)
    if (name === 'rotate' || name === 'rot') continue
    if (name === 'scale') continue

    const cssStyles = this.propertyToCSS(prop, primitive, transformContext, parentLayoutContext)
    styles.push(...cssStyles)
  }

  // Generate combined transform AFTER second pass
  // This allows multiple transforms (rotate + scale etc.) to combine
  if (transformContext.transforms.length > 0) {
    styles.push({ property: 'transform', value: transformContext.transforms.join(' ') })
  }

  // Remove automatic min-width: 0 / min-height: 0 if explicit values exist
  // This prevents w full from overwriting explicit minw/minh values
  // The "last wins" rule should only apply to same-source properties, not automatic additions
  if (hasExplicitMinWidth || hasExplicitMinHeight) {
    const filteredStyles = styles.filter(s => {
      if (s.property === 'min-width' && s.value === '0' && hasExplicitMinWidth) return false
      if (s.property === 'min-height' && s.value === '0' && hasExplicitMinHeight) return false
      return true
    })
    return filteredStyles
  }

  return styles
}

/**
 * Convert Mirror property to CSS
 * @param parentLayoutContext - If parent is grid, x/y/w/h generate grid positioning instead of absolute
 */
export function propertyToCSS(
  this: IRTransformer,
  prop: Property,
  primitive: string = 'frame',
  transformContext?: { transforms: string[] },
  parentLayoutContext?: ParentLayoutContext
): IRStyle[] {
  // Create context for the extracted function
  const ctx: PropertyTransformContext = {
    resolveValue: (values, propertyName) =>
      resolveValueExtracted(values, this.tokenSet, propertyName),
    validateProperty: (propName, position) => this.validateProperty(propName, position),
  }
  return propertyToCSSExtracted(prop, ctx, primitive, transformContext, parentLayoutContext)
}
