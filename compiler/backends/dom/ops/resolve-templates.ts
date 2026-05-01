/**
 * DOMGenerator ops — resolve-templates
 *
 * Extracted from compiler/backends/dom.ts. Functions take `this: DOMGenerator`
 * and are bound on the class via class-field assignment.
 */

import type { DOMGenerator } from '../../dom'

export function resolveTemplateValue(
  this: DOMGenerator,
  value: string | number | boolean,
  itemVar: string,
  indexVar: string = 'index'
): string {
  if (typeof value === 'string') {
    // Check for __loopVar: markers (set by IR for loop variable references)
    // Use regex replacement for ALL occurrences (handles multiple markers in expressions)
    if (value.includes('__loopVar:')) {
      // e.g., "__loopVar:user.name" -> user.name (unquoted)
      // e.g., "__loopVar:index + 1" -> index + 1
      // e.g., "__loopVar:team.name + __loopVar:team.members.length" -> team.name + team.members.length
      // Replace __loopVar:name with just name (including array indexing and nested properties)
      let resolved = value.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
      // Also handle $-variables in expressions
      resolved = resolved.replace(
        /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
        '$get("$1")'
      )
      return resolved
    }

    // Check for $$ escape followed by item variable reference like $$product.price
    // This should produce: "$" + product.price (literal $ + loop var value)
    if (value.includes(`$$${itemVar}.`)) {
      // Check if value is ONLY $$itemVar.property (no other text)
      const exactMatch = value.match(new RegExp(`^\\$\\$${itemVar}\\.([a-zA-Z_][a-zA-Z0-9_.]*)$`))
      if (exactMatch) {
        // Simple case: "$$product.price" -> "$" + product.price
        return `"$" + ${itemVar}.${exactMatch[1]}`
      }
      // Complex case: "Price: $$product.price" -> template literal with interpolation
      // Convert $$product.price to ${product.price} within a template literal
      const resolved = value.replace(
        new RegExp(`\\$\\$${itemVar}\\.([a-zA-Z_][a-zA-Z0-9_.]*)`, 'g'),
        `\$\${${itemVar}.$1}`
      )
      return `\`${this.escapeTemplateString(resolved)}\``
    }

    // Check if value contains item variable reference like $task.title
    // OR an index variable reference like $idx (Bug #27 fix: handle index
    // var alongside item var in mixed template strings).
    const hasIndexRef = new RegExp(`\\$${indexVar}\\b`).test(value)
    if (value.includes(`$${itemVar}.`) || value.includes(`\${${itemVar}.`) || hasIndexRef) {
      // Two cases:
      //   (a) value is EXACTLY "$task.title" (with leading $) → JS expression
      //   (b) value is e.g. "before $task.title after" → template literal
      const exactMatch = value.match(new RegExp(`^\\$${itemVar}\\.([a-zA-Z_][a-zA-Z0-9_.]*)$`))
      if (exactMatch) {
        // Pure expression — emit as raw JS access
        return `${itemVar}.${exactMatch[1]}`
      }
      // Mixed string with $loopvar references — template literal
      // (also escape user-provided ${...} to prevent JS injection)
      const ESC = '\x00ESC\x00'
      let processed = value.replace(/\$\{/g, ESC)
      // Substitute $itemVar.path FIRST (more specific than $indexVar),
      // then $indexVar (bare reference).
      processed = processed.replace(
        new RegExp(`\\$${itemVar}\\.([a-zA-Z_][a-zA-Z0-9_.]*)`, 'g'),
        `\$\${${itemVar}.$1}`
      )
      // Bug #27 fix: also substitute $indexVar in template strings.
      // Use word-boundary so `$indexVar` doesn't accidentally match inside
      // a longer identifier like `$indexVar2`.
      processed = processed.replace(new RegExp(`\\$${indexVar}\\b`, 'g'), `\$\${${indexVar}}`)
      const escaped = this.escapeTemplateString(processed)
      const safe = escaped.replace(new RegExp(ESC, 'g'), '\\${')
      return `\`${safe}\``
    }
    // Check for plain item reference $task -> task
    if (value === `$${itemVar}`) {
      return itemVar
    }
    // Check for plain index reference $index -> index
    if (value === `$${indexVar}`) {
      return indexVar
    }
    return `"${this.escapeString(String(value))}"`
  }
  return String(value)
}

export function resolveTemplateStyleValue(
  this: DOMGenerator,
  value: string,
  itemVar: string
): string {
  // Handle __conditional: markers (ternary expressions from IR)
  // Format: __conditional:condition?thenValue:elseValue
  if (value.includes('__conditional:')) {
    return this.resolveConditionalExpression(value, itemVar)
  }

  // Handle __loopVar: markers
  if (value.includes('__loopVar:')) {
    const resolved = value.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
    // Wrap in parentheses if it's an expression
    if (resolved.includes(' ')) {
      return `(${resolved})`
    }
    return resolved
  }

  // Check if value is exactly the item variable (e.g., $color -> color)
  if (value === `$${itemVar}`) {
    return itemVar
  }
  // Check if value contains item variable reference with property access
  if (value.includes(`$${itemVar}.`) || value.includes(`\${${itemVar}.`)) {
    const resolved = value.replace(new RegExp(`\\$${itemVar}\\.`, 'g'), `${itemVar}.`)
    return resolved
  }
  return `'${value}'`
}

/**
 * Resolve __conditional: markers into proper JavaScript ternary expressions
 * Handles nested conditionals (chained ternary)
 */
export function resolveConditionalExpression(
  this: DOMGenerator,
  value: string,
  itemVar: string
): string {
  // Parse __conditional:condition?then:else pattern
  // Note: 'else' part may itself be another __conditional (nested ternary)
  const parseConditional = (str: string): string => {
    if (!str.startsWith('__conditional:')) {
      // Not a conditional - resolve as a value
      return this.resolveConditionalValue(str, itemVar)
    }

    // Remove __conditional: prefix
    const content = str.slice('__conditional:'.length)

    // Find the ? that separates condition from then/else
    // Need to be careful with nested conditionals
    let questionPos = -1
    let depth = 0
    for (let i = 0; i < content.length; i++) {
      const char = content[i]
      if (char === '(') depth++
      else if (char === ')') depth--
      else if (char === '?' && depth === 0 && !content.slice(i - 1, i + 1).match(/[=!<>]=?\?/)) {
        // Found ? not part of === or !== etc
        questionPos = i
        break
      }
    }

    if (questionPos === -1) {
      // No valid ternary found, return as-is
      return this.resolveConditionalValue(content, itemVar)
    }

    const condition = content.slice(0, questionPos)
    const rest = content.slice(questionPos + 1)

    // Find the : that separates then from else
    // Need to handle nested __conditional: in else part
    let colonPos = -1
    depth = 0
    let inConditional = false
    for (let i = 0; i < rest.length; i++) {
      const char = rest[i]
      if (rest.slice(i).startsWith('__conditional:')) {
        inConditional = true
      }
      // Skip the colon that belongs to a marker prefix like `__loopVar:`
      // or `__conditional:`. `__loopVar:accent:__loopVar:danger` must not
      // split at the first internal colon.
      if (rest.slice(i).startsWith('__loopVar:') || rest.slice(i).startsWith('__conditional:')) {
        i += rest.slice(i).indexOf(':')
        continue
      }
      if (char === '(') depth++
      else if (char === ')') depth--
      else if (char === ':' && depth === 0 && !inConditional) {
        colonPos = i
        break
      }
      // Reset inConditional after seeing a ? in nested conditional
      if (char === '?' && inConditional) {
        inConditional = false
      }
    }

    if (colonPos === -1) {
      // Fallback: split at first : not in nested conditional
      colonPos = rest.indexOf(':')
    }

    const thenValue = rest.slice(0, colonPos)
    const elseValue = rest.slice(colonPos + 1)

    // Resolve the condition (replace __loopVar: markers)
    const resolvedCondition = this.resolveLoopVarMarkers(condition, itemVar)

    // Recursively parse then/else (may be nested conditionals)
    const resolvedThen = parseConditional(thenValue)
    const resolvedElse = parseConditional(elseValue)

    return `(${resolvedCondition} ? ${resolvedThen} : ${resolvedElse})`
  }

  return parseConditional(value)
}

/**
 * Resolve a single value in a conditional (color, string, etc.)
 */
export function resolveConditionalValue(
  this: DOMGenerator,
  value: string,
  itemVar: string
): string {
  // Handle __loopVar: markers
  if (value.includes('__loopVar:')) {
    return this.resolveLoopVarMarkers(value, itemVar)
  }

  // Handle item variable reference
  if (value.includes(`$${itemVar}.`)) {
    return value.replace(new RegExp(`\\$${itemVar}\\.`, 'g'), `${itemVar}.`)
  }

  // Already-quoted string from elseTokens — pass through.
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value
  }

  // Check if it's a color (hex)
  if (value.startsWith('#')) {
    return `"${value}"`
  }

  // Check if it's a number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value
  }

  // Default: wrap in quotes
  return `"${value}"`
}

/**
 * Replace __loopVar: markers with actual variable references.
 *
 * `__loopVar:name` is the IR's neutral marker for any reference originally
 * written as `$name`. Whether it's actually a loop variable depends on
 * context:
 *  - If `name` matches the current `itemVar`, it stays bare (function arg).
 *  - Otherwise it's a data/token reference, so it becomes `$get("name")`.
 */
export function resolveLoopVarMarkers(this: DOMGenerator, str: string, itemVar?: string): string {
  return str.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, (_, ref) => {
    const firstPart = ref.split('.')[0].split('[')[0]
    if (itemVar && firstPart === itemVar) return ref
    return `$get("${ref}")`
  })
}

/**
 * Resolve a style value for non-loop context (top-level nodes)
 * Handles __conditional: markers by converting them to $get()-based ternary expressions
 */
export function resolveStyleValueForTopLevel(
  this: DOMGenerator,
  value: string
): { code: string; needsEval: boolean } {
  if (!value.includes('__conditional:')) {
    return { code: `'${value}'`, needsEval: false }
  }

  // Parse and convert conditional to $get()-based ternary
  const resolvedCode = this.parseTopLevelConditional(value)
  return { code: resolvedCode, needsEval: true }
}

export function parseTopLevelConditional(this: DOMGenerator, str: string): string {
  if (!str.startsWith('__conditional:')) {
    return this.resolveTopLevelValue(str)
  }

  const content = str.slice('__conditional:'.length)

  // Find the ? that separates condition from then/else
  let questionPos = -1
  let depth = 0
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (
      char === '?' &&
      depth === 0 &&
      !content.slice(Math.max(0, i - 1), i + 1).match(/[=!<>]=?\?/)
    ) {
      questionPos = i
      break
    }
  }

  if (questionPos === -1) {
    return this.resolveTopLevelValue(content)
  }

  const condition = content.slice(0, questionPos).trim()
  const rest = content.slice(questionPos + 1)

  // Find the : that separates then from else
  let colonPos = -1
  depth = 0
  let inConditional = false
  let inString: string | null = null // tracks open quote char
  for (let i = 0; i < rest.length; i++) {
    const char = rest[i]
    // Skip colons inside string literals (Bug #26 fix). Without this, a
    // then-branch like `"Items: $count"` would be split at the colon
    // inside the string.
    if (inString) {
      if (char === inString && rest[i - 1] !== '\\') inString = null
      continue
    }
    if (char === '"' || char === "'") {
      inString = char
      continue
    }
    if (rest.slice(i).startsWith('__conditional:')) {
      inConditional = true
    }
    // Skip the colon that belongs to a marker prefix like `__loopVar:`
    // or `__conditional:`. Without this, `__loopVar:accent:__loopVar:danger`
    // would split at the first internal `:` and produce invalid JS.
    if (rest.slice(i).startsWith('__loopVar:') || rest.slice(i).startsWith('__conditional:')) {
      // jump past the marker name + the colon
      i += rest.slice(i).indexOf(':')
      continue
    }
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ':' && depth === 0 && !inConditional) {
      colonPos = i
      break
    }
    if (char === '?' && inConditional) {
      inConditional = false
    }
  }

  if (colonPos === -1) {
    return this.resolveTopLevelValue(content)
  }

  const thenValue = rest.slice(0, colonPos).trim()
  const elseValue = rest.slice(colonPos + 1).trim()

  // Resolve condition: bare identifiers become $get("identifier")
  const resolvedCondition = this.resolveTopLevelCondition(condition)

  // Recursively parse then/else
  const resolvedThen = this.parseTopLevelConditional(thenValue)
  const resolvedElse = this.parseTopLevelConditional(elseValue)

  return `(${resolvedCondition} ? ${resolvedThen} : ${resolvedElse})`
}

export function resolveTopLevelCondition(this: DOMGenerator, condition: string): string {
  // Replace bare identifiers with $get("identifier")
  const reserved = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'])

  // Mask strings BEFORE wrapping bare identifiers — otherwise identifiers
  // inside user strings get wrapped (e.g. category === "Geschäftlich"
  // would be split because `ä` is non-ASCII), and the result is invalid JS.
  // Same trick as `resolveConditionVariables`: wrap placeholder in quotes
  // so the lookbehind exclusion `["\w$.]` skips it.
  const stringPlaceholders: string[] = []
  const placeholderFor = (idx: number) => `"__MIRROR_STR_${idx}_END__"`
  let result = condition.replace(/"((?:[^"\\]|\\.)*)"/g, m => {
    const idx = stringPlaceholders.length
    stringPlaceholders.push(m)
    return placeholderFor(idx)
  })
  result = result.replace(/'((?:[^'\\]|\\.)*)'/g, m => {
    const idx = stringPlaceholders.length
    stringPlaceholders.push(m)
    return placeholderFor(idx)
  })

  // Strip `__loopVar:` markers (set by IR for loop variable references).
  // Without this, `__loopVar:item.field` would be wrapped as if `__loopVar`
  // and `item.field` were two separate identifiers separated by ":" — which
  // produces invalid JS (`$get("__loopVar"):$get("item.field")`).
  result = result.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*)/g, '$1')

  // Wrap bare identifiers with $get(). Non-ASCII identifiers (umlauts,
  // emoji etc.) are NOT matched — they're left alone (treated as raw JS).
  result = result.replace(
    /(?<!["\w$.])\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b(?!["\w(])/g,
    (match, identifier) => {
      const firstPart = identifier.split('.')[0]
      if (reserved.has(firstPart)) return match
      return `$get("${identifier}")`
    }
  )

  // Restore strings
  result = result.replace(
    /"__MIRROR_STR_(\d+)_END__"/g,
    (_, idx) => stringPlaceholders[parseInt(idx, 10)]
  )
  return result
}

export function resolveTopLevelValue(this: DOMGenerator, value: string): string {
  // Already-quoted string (from elseTokens collection) — pass through,
  // but rewrite `__loopVar:name` markers inside the string into a JS
  // template literal so the runtime substitutes the variable value
  // (Bug #26 fix: `"Items: __loopVar:count"` became literal text).
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    const inner = value.slice(1, -1)
    if (inner.includes('__loopVar:')) {
      // Rewrite into a template literal: `Items: ${$get("count")}`
      const tpl = inner.replace(
        /__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*)/g,
        (_, n) => `\${$get("${n}")}`
      )
      return `\`${tpl}\``
    }
    return value
  }
  // Handle hex colors
  if (value.startsWith('#')) {
    return `"${value}"`
  }
  // Handle numbers
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return value
  }
  // Handle bare `__loopVar:name` — at top-level this is a $get() reference.
  if (value.startsWith('__loopVar:')) {
    return `$get("${value.slice('__loopVar:'.length)}")`
  }
  // Handle named colors and other values
  return `"${value}"`
}
