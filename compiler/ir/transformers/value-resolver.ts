/**
 * Value Resolution Functions
 *
 * Pure functions for resolving property values to CSS/content strings.
 * Extracted from IRTransformer for modularity.
 */

import type { TokenReference, LoopVarReference, Conditional, ComputedExpression } from '../../parser/ast'

// Local type definition - matches parser usage
type PropertyValue = string | number | boolean | TokenReference | LoopVarReference | Conditional | ComputedExpression
import type { IRProperty } from '../types'
import { PROPERTY_TO_TOKEN_SUFFIX } from '../../schema/ir-helpers'
import { buildExpressionString } from './expression-transformer'

/**
 * Context for token resolution
 */
export interface TokenContext {
  tokenSet: Set<string>
}

/**
 * Resolve content values (textContent) - preserves $-variable references
 * Unlike resolveValue which converts to CSS variables, this keeps $name format
 * for runtime resolution via $get()
 */
export function resolveContentValue(values: PropertyValue[]): string {
  return values
    .map(v => {
      // Computed expression - build JavaScript expression string
      if (typeof v === 'object' && v.kind === 'expression') {
        return buildExpressionString(v.parts, v.operators)
      }
      // Explicit token reference object - preserve as $name for runtime
      if (typeof v === 'object' && v.kind === 'token') {
        return `$${v.name}`
      }
      // Loop variable reference - preserve with special marker for backend
      if (typeof v === 'object' && v.kind === 'loopVar') {
        return `__loopVar:${v.name}`
      }
      // String that starts with $ - preserve as-is
      if (typeof v === 'string' && v.startsWith('$')) {
        return v
      }
      return String(v)
    })
    .join(' ')
}

/**
 * Try to resolve a short token name using property context
 * e.g., 'primary' with property 'bg' -> 'primary.bg' if '$primary.bg' exists in tokens
 */
export function resolveTokenWithContext(
  tokenName: string,
  tokenSet: Set<string>,
  propertyName?: string
): string {
  // If token already exists as-is (e.g., 'primary'), use it
  if (tokenSet.has(tokenName)) {
    return tokenName
  }

  // Try to add property-specific suffix
  // e.g., 'primary' + '.bg' = 'primary.bg' if '$primary.bg' exists
  if (propertyName) {
    const suffix = PROPERTY_TO_TOKEN_SUFFIX[propertyName]
    if (suffix) {
      const extendedName = tokenName + suffix
      // Check both with and without $ prefix
      if (tokenSet.has(extendedName)) {
        return extendedName
      }
      // Check with $ prefix (e.g., '$primary.bg')
      if (tokenSet.has('$' + extendedName)) {
        return extendedName
      }
    }
  }

  // Fall back to original name
  return tokenName
}

/**
 * Process a conditional value string, detecting and wrapping nested ternary expressions
 * e.g., "$a === 'X' ? #111 : $a === 'Y' ? #222 : #333" becomes
 *       "__conditional:__loopVar:a === 'X'?#111:__conditional:__loopVar:a === 'Y'?#222:#333"
 */
function processConditionalValue(value: string): string {
  // Check if this value itself is a ternary expression
  // Pattern: condition ? then : else (where condition contains comparison operators)
  // Need to find the ? that separates condition from then/else
  const ternaryMatch = value.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/)
  if (ternaryMatch) {
    const [, condition, thenPart, elsePart] = ternaryMatch
    // Check if this looks like a conditional (has comparison operator in condition)
    if (/[=!<>]=?|===|!==/.test(condition)) {
      // Mark loop variables in condition
      const condStr = condition.replace(/\$([a-zA-Z_][a-zA-Z0-9_.]*)/g, '__loopVar:$1')
      // Recursively process then/else parts
      const processedThen = processConditionalValue(thenPart.trim())
      const processedElse = processConditionalValue(elsePart.trim())
      return `__conditional:${condStr}?${processedThen}:${processedElse}`
    }
  }
  // Not a ternary - return as-is (mark loop vars if any)
  return value.replace(/\$([a-zA-Z_][a-zA-Z0-9_.]*)/g, '__loopVar:$1')
}

/**
 * Resolve property values to CSS value string
 * Converts token references to CSS variables, handles expressions and conditionals
 */
export function resolveValue(
  values: PropertyValue[],
  tokenSet: Set<string>,
  propertyName?: string
): string {
  return values
    .map(v => {
      // Explicit token reference object
      if (typeof v === 'object' && v.kind === 'token') {
        const tokenName = v.name
        // Check if this is a known design token
        // Try direct match first (e.g., 'primary'), then with $ prefix (e.g., '$size')
        if (tokenSet.has(tokenName)) {
          const resolvedName = resolveTokenWithContext(tokenName, tokenSet, propertyName)
          // Convert dots to hyphens for valid CSS variable name
          const cssVarName = resolvedName.replace(/\./g, '-')
          return `var(--${cssVarName})`
        }
        // Check with $ prefix (e.g., token defined as '$size: 100', used as 'w $size')
        if (tokenSet.has('$' + tokenName)) {
          // Convert dots to hyphens for valid CSS variable name
          const cssVarName = tokenName.replace(/\./g, '-')
          return `var(--${cssVarName})`
        }
        // Try context-based resolution (e.g., 'primary' + '.bg' -> '$primary.bg')
        if (propertyName) {
          const suffix = PROPERTY_TO_TOKEN_SUFFIX[propertyName]
          if (suffix) {
            const extendedName = tokenName + suffix
            const withDollar = '$' + extendedName
            if (tokenSet.has(extendedName) || tokenSet.has(withDollar)) {
              // Convert dots to hyphens for valid CSS variable name
              const cssVarName = extendedName.replace(/\./g, '-')
              return `var(--${cssVarName})`
            }
          }
        }
        // Not a known token - likely a loop variable reference (e.g., user.name from each loop)
        // Preserve as $name format for runtime interpolation
        return `$${tokenName}`
      }
      // String that matches a token name
      if (typeof v === 'string' && tokenSet.has(v)) {
        // Convert dots to hyphens for valid CSS variable name
        const cssVarName = v.replace(/\./g, '-')
        return `var(--${cssVarName})`
      }
      // Loop variable reference - preserve with marker for backend
      if (typeof v === 'object' && v.kind === 'loopVar') {
        return `__loopVar:${v.name}`
      }
      // Computed expression - build JavaScript expression string
      if (typeof v === 'object' && v.kind === 'expression') {
        return buildExpressionString(v.parts, v.operators)
      }
      // Conditional (ternary) expression - build JavaScript ternary
      if (typeof v === 'object' && v.kind === 'conditional') {
        const cond = v as Conditional
        // Mark loop variables in condition with __loopVar:
        const condStr = cond.condition.replace(/\$([a-zA-Z_][a-zA-Z0-9_.]*)/g, '__loopVar:$1')
        // Process then/else values - they might contain nested ternaries as strings
        const thenVal = processConditionalValue(String(cond.then))
        const elseVal = processConditionalValue(String(cond.else))
        return `__conditional:${condStr}?${thenVal}:${elseVal}`
      }
      return String(v)
    })
    .join(' ')
}

/**
 * Extract HTML properties (non-CSS) from property list
 * Handles content, href, src, placeholder, disabled, etc.
 */
export function extractHTMLProperties(
  properties: { name: string; values: PropertyValue[] }[],
  tokenSet: Set<string>,
  primitive?: string
): IRProperty[] {
  const htmlProps: IRProperty[] = []

  // Auto-set type for checkbox/radio primitives
  if (primitive === 'checkbox') {
    htmlProps.push({ name: 'type', value: 'checkbox' })
  } else if (primitive === 'radio') {
    htmlProps.push({ name: 'type', value: 'radio' })
  }

  // Default icon size (can be overridden via icon-size or is property)
  if (primitive === 'icon') {
    const hasIconSize = properties.some(p => p.name === 'icon-size' || p.name === 'is')
    if (!hasIconSize) {
      htmlProps.push({ name: 'data-icon-size', value: '16' })
    }
  }

  for (const prop of properties) {
    // content = text content (from strings like "Hello" or "$name")
    // propset = property set reference (handled in transformProperties, skip here)
    if (prop.name === 'content') {
      htmlProps.push({ name: 'textContent', value: resolveContentValue(prop.values) })
    }
    if (prop.name === 'href') {
      htmlProps.push({ name: 'href', value: resolveValue(prop.values, tokenSet) })
    }
    if (prop.name === 'src') {
      htmlProps.push({ name: 'src', value: resolveValue(prop.values, tokenSet) })
    }
    if (prop.name === 'placeholder') {
      htmlProps.push({ name: 'placeholder', value: resolveValue(prop.values, tokenSet) })
    }
    if (prop.name === 'disabled') {
      htmlProps.push({ name: 'disabled', value: true })
    }
    if (prop.name === 'readonly') {
      htmlProps.push({ name: 'readonly', value: true })
    }
    if (prop.name === 'type') {
      htmlProps.push({ name: 'type', value: resolveValue(prop.values, tokenSet) })
    }
    if (prop.name === 'name') {
      htmlProps.push({ name: 'name', value: resolveValue(prop.values, tokenSet) })
    }
    if (prop.name === 'value') {
      // For value properties, use resolveContentValue to preserve $-references for two-way binding
      // This allows Input value $user.name to become a bidirectional binding
      htmlProps.push({ name: 'value', value: resolveContentValue(prop.values) })
    }
    if (prop.name === 'checked') {
      // If checked has a value (like todo.done), preserve it as a binding reference
      // Otherwise, just set checked to true (standalone flag)
      if (prop.values && prop.values.length > 0) {
        const bindingValue = resolveContentValue(prop.values)
        // If it's a loop variable binding (e.g., __loopVar:todo.done), preserve it
        if (bindingValue.includes('__loopVar:') || bindingValue.includes('.')) {
          htmlProps.push({ name: 'checked', value: bindingValue })
        } else {
          htmlProps.push({ name: 'checked', value: true })
        }
      } else {
        htmlProps.push({ name: 'checked', value: true })
      }
    }
    // Note: 'hidden' is handled as CSS (display: none) not HTML attribute
    // This allows state transitions with 'visible' to properly show the element
    // Icon properties - pass through as data attributes for runtime handling
    if (prop.name === 'icon-size' || prop.name === 'is') {
      htmlProps.push({ name: 'data-icon-size', value: resolveValue(prop.values, tokenSet) })
    }
    if (prop.name === 'icon-color' || prop.name === 'ic') {
      htmlProps.push({ name: 'data-icon-color', value: resolveValue(prop.values, tokenSet) })
    }
    if (prop.name === 'icon-weight' || prop.name === 'iw') {
      htmlProps.push({ name: 'data-icon-weight', value: resolveValue(prop.values, tokenSet) })
    }
    if (prop.name === 'fill') {
      htmlProps.push({ name: 'data-icon-fill', value: true })
    }
    // Focusable - makes element keyboard-focusable
    if (prop.name === 'focusable') {
      htmlProps.push({ name: 'tabindex', value: '0' })
    }
    // Editable - makes text element inline-editable
    if (prop.name === 'editable') {
      htmlProps.push({ name: 'data-editable', value: true })
    }
    // keyboard-nav / keynav - handled in IR transformation, not as HTML prop
  }

  return htmlProps
}
