/**
 * Data Transformer
 *
 * Pure functions for transforming data and animation AST nodes to IR format.
 * Handles data attributes, data values, animation definitions, and state conversions.
 *
 * Extracted from ir/index.ts for modularity.
 */

import type {
  DataAttribute,
  DataReference,
  DataReferenceArray,
  AnimationDefinition,
  AnimationKeyframe,
  AnimationKeyframeProperty,
  StateDependency,
  StateAnimation,
} from '../../parser/ast'
import type {
  IRDataObject,
  IRDataValue,
  IRDataReference,
  IRDataReferenceArray,
  IRAnimation,
  IRAnimationKeyframe,
  IRAnimationProperty,
  IRStateDependency,
  IRStateAnimation,
} from '../types'

// =============================================================================
// Data Transformation
// =============================================================================

/**
 * Transform data attributes (from data blocks) to IR format.
 *
 * Detects two shapes:
 * - **List style** — every attr is a bare `value` line where `key === value`,
 *   no children. The Mirror DSL `colors:\n  red\n  blue\n  red` produces this.
 *   Returned as `IRDataValue[]` to preserve duplicates and ordering. Without
 *   this, the JS-object key uniqueness would deduplicate the entries.
 * - **Object style** — anything else (key/value pairs, nested children).
 *   Returned as `IRDataObject` (Record<string, IRDataValue>).
 */
export function transformDataAttributes(attrs: DataAttribute[]): IRDataObject | IRDataValue[] {
  // List-style detection: all attrs are simple `key === value` items
  // without nested children. This is how the Mirror parser stores
  // bare-value list lines (see `parser.ts` parseDataObjectBody).
  const isListStyle =
    attrs.length > 0 &&
    attrs.every(
      a => (!a.children || a.children.length === 0) && a.value !== undefined && a.value === a.key
    )

  if (isListStyle) {
    return attrs.map(a => transformDataValue(a.value!))
  }

  const result: IRDataObject = {}
  for (const attr of attrs) {
    if (attr.children && attr.children.length > 0) {
      // Nested object - recurse (list-style detection is recursive too)
      result[attr.key] = transformDataAttributes(attr.children) as IRDataValue
    } else if (attr.value !== undefined) {
      result[attr.key] = transformDataValue(attr.value)
    }
  }

  return result
}

/**
 * Transform a single data value to IR format.
 * Handles primitives, references, and reference arrays.
 */
export function transformDataValue(
  value: string | number | boolean | string[] | DataReference | DataReferenceArray
): IRDataValue {
  // Handle references
  if (typeof value === 'object' && value !== null) {
    if ('kind' in value) {
      if (value.kind === 'reference') {
        return {
          __ref: true,
          collection: value.collection,
          entry: value.entry,
        } as IRDataReference
      }
      if (value.kind === 'referenceArray') {
        return {
          __refArray: true,
          references: value.references.map(ref => ({
            __ref: true,
            collection: ref.collection,
            entry: ref.entry,
          })),
        } as IRDataReferenceArray
      }
    }
    // String array
    if (Array.isArray(value)) {
      return value
    }
  }

  // Primitive value (string, number, boolean)
  return value as string | number | boolean
}

// =============================================================================
// Animation Transformation
// =============================================================================

/**
 * Transform an animation definition from AST to IR.
 */
export function transformAnimation(anim: AnimationDefinition): IRAnimation {
  return {
    name: anim.name,
    easing: anim.easing || 'ease',
    duration: anim.duration,
    roles: anim.roles,
    keyframes: anim.keyframes.map(kf => transformAnimationKeyframe(kf)),
  }
}

/**
 * Transform an animation keyframe from AST to IR.
 */
export function transformAnimationKeyframe(kf: AnimationKeyframe): IRAnimationKeyframe {
  return {
    time: kf.time,
    properties: kf.properties.map(prop => transformAnimationProperty(prop)),
  }
}

/**
 * Transform an animation property from AST to IR.
 * Maps Mirror property names to CSS properties and formats values.
 */
export function transformAnimationProperty(prop: AnimationKeyframeProperty): IRAnimationProperty {
  // Map Mirror property names to CSS properties
  const propertyMap: Record<string, string> = {
    opacity: 'opacity',
    'y-offset': 'transform',
    'x-offset': 'transform',
    scale: 'transform',
    rotate: 'transform',
    background: 'background',
    bg: 'background',
    color: 'color',
    col: 'color',
    width: 'width',
    height: 'height',
    'border-radius': 'border-radius',
    rad: 'border-radius',
  }

  const cssProperty = propertyMap[prop.name] || prop.name
  let cssValue = String(prop.value)

  // Format transform values
  if (prop.name === 'y-offset') {
    cssValue = `translateY(${prop.value}px)`
  } else if (prop.name === 'x-offset') {
    cssValue = `translateX(${prop.value}px)`
  } else if (prop.name === 'scale') {
    cssValue = `scale(${prop.value})`
  } else if (prop.name === 'rotate') {
    cssValue = `rotate(${prop.value}deg)`
  } else if (
    ['width', 'height', 'border-radius', 'rad'].includes(prop.name) &&
    typeof prop.value === 'number'
  ) {
    cssValue = `${prop.value}px`
  }

  return {
    target: prop.target,
    property: cssProperty,
    value: cssValue,
    easing: prop.easing,
  }
}

// =============================================================================
// State Conversion
// =============================================================================

export function convertStateDependency(dep: StateDependency): IRStateDependency {
  return {
    target: dep.target,
    state: dep.state,
    ...(dep.condition && { condition: dep.condition }),
    ...(dep.next && { next: convertStateDependency(dep.next) }),
  }
}

export function convertStateAnimation(anim: StateAnimation): IRStateAnimation {
  return {
    ...(anim.preset && { preset: anim.preset }),
    ...(anim.duration !== undefined && { duration: anim.duration }),
    ...(anim.easing && { easing: anim.easing }),
    ...(anim.delay !== undefined && { delay: anim.delay }),
  }
}
