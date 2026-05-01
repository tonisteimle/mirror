/**
 * DOMGenerator ops — resolve-utils
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
import {
  escapeJSString,
  cssPropertyToJS,
  generateVarName,
  sanitizeVarName as sanitizeVarNameUtil,
} from '../../dom/utils'
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

export function sanitizeVarName(this: DOMGenerator, id: string): string {
  return sanitizeVarNameUtil(id)
}

/**
 * Resolve content value for textContent, handling $-variables and loop variables
 * $name → $get('name')
 * $12.4k → "$12.4k" (literal, starts with digit)
 * __loopVar:user.name → user.name (unquoted, JS variable)
 * "literal" → "literal"
 * "Hello " + $name → "Hello " + $get("name") (expressions)
 */
export function resolveContentValue(this: DOMGenerator, value: string | number | boolean): string {
  if (typeof value === 'string') {
    // Check for loop variable reference (marked by IR)
    if (value.startsWith('__loopVar:')) {
      const varName = value.slice('__loopVar:'.length)
      return varName // Return unquoted - it's a JS variable reference
    }

    // Check for conditional expression (marked by IR)
    // Format: __conditional:condition?thenValue:elseValue
    if (value.includes('__conditional:')) {
      return this.parseTopLevelConditional(value)
    }

    // Check if this is a computed expression from the IR
    // Expressions from IR look like: "Hello " + $name or $count * $price
    // They have: quoted strings AND/OR $-variables with operators between them
    // Plain strings look like: Tokens + Komponenten (no quotes, no $)
    const hasOperators =
      value.includes(' + ') ||
      value.includes(' - ') ||
      value.includes(' * ') ||
      value.includes(' / ')
    const hasQuotedParts = /^"[^"]*"/.test(value) || /" [+\-*/] /.test(value)
    const hasDollarVars = /\$[a-zA-Z_]/.test(value)
    const hasLoopVarMarkers = value.includes('__loopVar:')

    if (hasOperators && (hasQuotedParts || hasDollarVars || hasLoopVarMarkers)) {
      // This is a computed expression - replace $varName with $get("varName")
      // and __loopVar:name with just name
      return this.resolveExpressionVariables(value)
    }

    // Check for simple $-variable reference (ONLY the variable, nothing else)
    // $name, $user.name → variable
    // $discount% → needs interpolation (has suffix)
    // $12.4k, $100 → literal (currency/number)
    const simpleVarMatch = value.match(/^\$([a-zA-Z_][a-zA-Z0-9_.]*)$/)
    if (simpleVarMatch && !value.startsWith('$get(')) {
      return `$get("${simpleVarMatch[1]}")`
    }

    // String interpolation: "Hello $firstName" or "$discount%" → template literal
    // Handle $$ as escape for literal $ sign followed by variable value
    if (/\$[a-zA-Z_][a-zA-Z0-9_.]*/.test(value)) {
      const GET_PLACEHOLDER = '\x00GET\x00'
      const ESC_PLACEHOLDER = '\x00ESC\x00'
      let processed = value

      // SECURITY: Mark user-provided ${...} patterns so we can escape them
      // back into LITERAL `\${` after `escapeTemplateString` runs. Mirror's
      // variable syntax is `$name` only — there is no `${...}` in the DSL.
      // Without this, user input `${alert('xss')}` would become a live
      // template-literal interpolation (arbitrary code execution).
      processed = processed.replace(/\$\{/g, ESC_PLACEHOLDER)

      // First, handle $$varName pattern: literal $ + variable value
      // e.g., "$$price" → "$${__GET__("price")}" (placeholder to avoid re-matching)
      processed = processed.replace(
        /\$\$([a-zA-Z_][a-zA-Z0-9_.]*)/g,
        (match, varName) => `\$\${${GET_PLACEHOLDER}("${varName}")}`
      )

      // Then, convert remaining $varName to ${$get("varName")}
      // Uses negative lookahead to skip $get( which shouldn't be re-processed.
      // The optional (...) group at the end captures aggregation arguments
      // like `$items.sum(value)` — the runtime $get() handles the full
      // pattern via aggMatch. Without this, `$items.sum(value)` would split
      // at the `(`, leaving `(value)` as literal trailing text.
      processed = processed.replace(
        /\$(?!get\()([a-zA-Z_][a-zA-Z0-9_.]*(?:\([^)]*\))?)/g,
        (match, varName) => `\${$get("${varName}")}`
      )

      // Restore $get placeholder
      processed = processed.replace(new RegExp(GET_PLACEHOLDER, 'g'), '$get')

      // Run the standard backtick/backslash/newline escaping
      const escaped = this.escapeTemplateString(processed)
      // NOW restore user `${` as literal `\${` (backslash-dollar-curly).
      // In a JS template literal, `\${...}` is read as: `\` is escape for `$`
      // (a no-op that yields a literal `$`), then `{...}` is literal text.
      // Net effect: the user's `${...}` content is preserved verbatim in the
      // output, never executed as JS.
      const safe = escaped.replace(new RegExp(ESC_PLACEHOLDER, 'g'), '\\${')
      return `\`${safe}\``
    }

    // Handle $$ in strings without other variables (e.g., "$$100")
    if (value.includes('$$')) {
      return `"${this.escapeString(value.replace(/\$\$/g, '$'))}"`
    }

    // Regular string literal
    return `"${this.escapeString(value)}"`
  }
  // Number or boolean
  return String(value)
}

/**
 * Replace $varName patterns in an expression with $get("varName")
 * and __loopVar:name patterns with just name (unquoted variable reference)
 * e.g., "Hello " + $name → "Hello " + $get("name")
 * e.g., $count * $price → $get("count") * $get("price")
 * e.g., __loopVar:index + 1 → index + 1
 */
export function resolveExpressionVariables(this: DOMGenerator, expr: string): string {
  // First, replace __loopVar:name with just name (unquoted)
  // Handles user.name[0] with array indexing
  let result = expr.replace(
    /__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g,
    (match, varName) => {
      return varName
    }
  )
  // Then, replace $varName or $var.name.deep patterns (but not $12.4k or $100)
  // Also handles aggregation method calls: $tasks.sum(hours), $items.sum(data.stats.value)
  // The pattern inside parentheses allows dots for nested paths like data.stats.value
  result = result.replace(
    /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\([a-zA-Z0-9_.,\s]*\))?)/g,
    (match, varName) => {
      return `$get("${varName}")`
    }
  )
  return result
}

/**
 * Escape a string for use in JavaScript string literals.
 * Handles backslashes, quotes, newlines, carriage returns, tabs, and other control characters.
 */
export function escapeString(
  this: DOMGenerator,
  str: string | number | boolean | undefined | null
): string {
  const s = String(str ?? '')
  return s
    .replace(/\\/g, '\\\\') // Backslashes first
    .replace(/"/g, '\\"') // Double quotes
    .replace(/\n/g, '\\n') // Newlines
    .replace(/\r/g, '\\r') // Carriage returns
    .replace(/\t/g, '\\t') // Tabs
    .replace(/\u2028/g, '\\u2028') // Line separator
    .replace(/\u2029/g, '\\u2029') // Paragraph separator
}

/**
 * Escape a template string (for backtick literals)
 * Escapes backticks and backslashes, but preserves ${...} interpolations
 */
export function escapeTemplateString(this: DOMGenerator, str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\n/g, '\\n')
}

/**
 * Resolve condition for loop context: loop variables (itemVar, indexVar) stay as-is
 * because they are local JavaScript variables. Only $-prefixed data variables get $get().
 * e.g., "entry.billable" stays as "entry.billable" (local var)
 * e.g., "$config.showAll" becomes "$get('config.showAll')"
 */
export function resolveLoopCondition(
  this: DOMGenerator,
  condition: string,
  itemVar: string,
  indexVar: string
): string {
  let result = condition

  // Handle $-prefixed variables. Two cases:
  //   1. $itemVar / $itemVar.field — refers to the loop variable. Strip the
  //      $ so we get the local JS access (`task.done`, not `$get("task.done")`).
  //   2. $globalVar.field — wrap in $get() for global data lookup.
  result = result.replace(
    /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
    (_match, path: string) => {
      const root = path.split('.')[0]
      if (root === itemVar || root === indexVar) return path
      return `$get("${path}")`
    }
  )

  // Loop variables (itemVar, indexVar) and their properties are local JS variables,
  // so they stay as-is (e.g., "entry.billable" remains "entry.billable")
  return result
}

/**
 * Transform condition expression to use $get() for variable lookups
 * e.g., "loggedIn" → "$get("loggedIn")"
 * e.g., "isAdmin && hasPermission" → "$get("isAdmin") && $get("hasPermission")"
 * e.g., "count > 0" → "$get("count") > 0"
 * e.g., "!disabled" → "!$get("disabled")"
 * e.g., "user.role === \"admin\"" → "$get("user.role") === "admin""
 */
export function resolveConditionVariables(this: DOMGenerator, condition: string): string {
  // JS keywords and literals that should NOT be wrapped in $get()
  const reserved = new Set([
    'true',
    'false',
    'null',
    'undefined',
    'NaN',
    'Infinity',
    'this',
    'typeof',
    'instanceof',
    'new',
    'delete',
    'void',
    'if',
    'else',
    'return',
    'function',
    'var',
    'let',
    'const',
  ])

  // First, collect all loop variable references marked with __loopVar:
  // These should NOT be wrapped in $get() - they are function parameters
  const loopVars = new Set<string>()
  condition.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*)/g, (_, varName) => {
    // Add the base variable name (e.g., "entry" from "entry.project")
    const baseName = varName.split('.')[0]
    loopVars.add(baseName)
    return ''
  })

  // Handle __loopVar: markers - strip the prefix but keep the variable name
  let result = condition.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')

  // SECURITY/CORRECTNESS: Mask string literals BEFORE identifier wrapping so
  // (a) bare identifiers inside `"..."` are NOT wrapped (which would break
  //     quote balance — `t.s == "${$get("x")}"` is invalid JS), and
  // (b) `${...}` template-literal-like patterns inside user strings stay
  //     literal (they're inside JS double/single quotes, so safe at runtime,
  //     but escaping helps if the string later moves to a backtick context).
  const stringPlaceholders: string[] = []
  // The placeholder is wrapped in quotes so it looks like a string literal:
  // the surrounding `"` triggers the bare-identifier regex's lookbehind
  // exclusion (`(?<!["\w$.)])`), so the inner `MIRROR_STR_X_END` token
  // doesn't get wrapped. On restore, we strip the outer quotes back to
  // the original string content (which had its own quotes).
  const placeholderFor = (idx: number) => `"__MIRROR_STR_${idx}_END__"`
  result = result.replace(/"((?:[^"\\]|\\.)*)"/g, match => {
    const idx = stringPlaceholders.length
    stringPlaceholders.push(match)
    return placeholderFor(idx)
  })
  result = result.replace(/'((?:[^'\\]|\\.)*)'/g, match => {
    const idx = stringPlaceholders.length
    stringPlaceholders.push(match)
    return placeholderFor(idx)
  })
  // Convert Mirror logical operators (and/or) to JavaScript (&&/||)
  result = result.replace(/\s+and\s+/g, ' && ').replace(/\s+or\s+/g, ' || ')

  // Then handle $-prefixed variables (already explicit)
  // Only capture the variable name, not method calls (stop at parenthesis)
  // $variable.property → $get("variable.property")
  // $variable.method() → $get("variable").method() (method is handled separately)
  result = result.replace(
    /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*?)(?=\s*\(|$|[^a-zA-Z0-9_.])/g,
    (match, varPath) => {
      // Check if next char is '(' - means this is followed by method call
      // In that case, only capture up to the last dot before method
      const parts = varPath.split('.')
      if (parts.length > 1) {
        // Check if the last part is likely a method (followed by parenthesis in original)
        // Since we can't easily look ahead, we check common method names
        const methodNames = new Set([
          'toLowerCase',
          'toUpperCase',
          'includes',
          'startsWith',
          'endsWith',
          'trim',
          'split',
          'join',
          'map',
          'filter',
          'find',
          'some',
          'every',
          'reduce',
          'toString',
          'valueOf',
        ])
        const lastPart = parts[parts.length - 1]
        if (methodNames.has(lastPart)) {
          // Last part is a method - only wrap up to the property before it
          const varOnly = parts.slice(0, -1).join('.')
          return `$get("${varOnly}").${lastPart}`
        }
      }
      return `$get("${varPath}")`
    }
  )

  // Now handle bare identifiers (not already wrapped, not in quotes, not reserved)
  // This regex finds identifiers with optional dot notation
  // We use a function to check if it's reserved or a loop variable
  // The lookbehind excludes: " (in string), \w (part of word), $ (variable), . (method call), ) (after function call)
  result = result.replace(
    /(?<!["\w$.)])([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?!["\w(])/g,
    (match, identifier) => {
      const firstPart = identifier.split('.')[0]
      // Don't wrap if it's a reserved word
      if (reserved.has(firstPart)) {
        return match
      }
      // Don't wrap if it's a loop variable (marked with __loopVar:)
      if (loopVars.has(firstPart)) {
        return match
      }
      // Don't wrap if it's already wrapped in $get
      return `$get("${identifier}")`
    }
  )

  // Restore the masked string literals (strip the outer quote-wrapping that
  // we added in the mask step — the original content already has its quotes).
  result = result.replace(
    /"__MIRROR_STR_(\d+)_END__"/g,
    (_, idx) => stringPlaceholders[parseInt(idx, 10)]
  )

  return result
}
