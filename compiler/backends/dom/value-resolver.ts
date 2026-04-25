/**
 * Value Resolver Module
 *
 * Transforms content values, expressions, and conditions
 * for Mirror DOM code generation.
 */

// ============================================
// STRING ESCAPING
// ============================================

/**
 * Escape a string for use in JavaScript string literals
 */
export function escapeString(str: string | number | boolean | undefined | null): string {
  const s = String(str ?? '')
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * Escape a template string (for backtick literals)
 */
export function escapeTemplateString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\n/g, '\\n')
}

// ============================================
// LOOP VARIABLE HANDLING
// ============================================

const LOOP_VAR_PREFIX = '__loopVar:'

/**
 * Check if value is a loop variable reference
 */
function isLoopVarReference(value: string): boolean {
  return value.startsWith(LOOP_VAR_PREFIX)
}

/**
 * Extract loop variable name from marker
 */
function extractLoopVarName(value: string): string {
  return value.slice(LOOP_VAR_PREFIX.length)
}

/**
 * Replace loop variable markers with actual variable names
 */
export function resolveLoopVarMarkers(str: string): string {
  return str.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g, '$1')
}

// ============================================
// EXPRESSION DETECTION
// ============================================

/**
 * Check if value has arithmetic operators
 */
function hasOperators(value: string): boolean {
  return (
    value.includes(' + ') || value.includes(' - ') || value.includes(' * ') || value.includes(' / ')
  )
}

/**
 * Check if value has quoted parts (from IR expressions)
 */
function hasQuotedParts(value: string): boolean {
  return /^"[^"]*"/.test(value) || /" [+\-*/] /.test(value)
}

/**
 * Check if value has dollar variables
 */
function hasDollarVars(value: string): boolean {
  return /\$[a-zA-Z_]/.test(value)
}

/**
 * Check if value is a computed expression from IR
 */
function isComputedExpression(value: string): boolean {
  if (!hasOperators(value)) return false
  return hasQuotedParts(value) || hasDollarVars(value) || value.includes(LOOP_VAR_PREFIX)
}

// ============================================
// VARIABLE RESOLUTION
// ============================================

/**
 * Check if value is a simple $variable reference
 */
function isSimpleVarReference(value: string): { match: boolean; varName?: string } {
  const match = value.match(/^\$([a-zA-Z_][a-zA-Z0-9_.]*)$/)
  if (match && !value.startsWith('$get(')) {
    return { match: true, varName: match[1] }
  }
  return { match: false }
}

/**
 * Resolve expression variables ($varName → $get("varName"))
 */
export function resolveExpressionVariables(expr: string): string {
  // First, replace __loopVar:name with just name
  let result = expr.replace(
    /__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*(?:\[\d+\])?)/g,
    (_, varName) => varName
  )

  // Then, replace $varName patterns
  result = result.replace(
    /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*(?:\([a-zA-Z0-9_.,\s]*\))?)/g,
    (_, varName) => `$get("${varName}")`
  )

  return result
}

// ============================================
// STRING INTERPOLATION
// ============================================

/**
 * Process string interpolation with $variables
 */
function resolveStringInterpolation(value: string): string {
  const GET_PLACEHOLDER = '\x00GET\x00'
  let processed = value

  // Handle $$varName pattern: literal $ + variable value
  processed = processed.replace(
    /\$\$([a-zA-Z_][a-zA-Z0-9_.]*)/g,
    (_, varName) => `\$\${${GET_PLACEHOLDER}("${varName}")}`
  )

  // Convert remaining $varName to ${$get("varName")}
  processed = processed.replace(
    /\$(?!get\()([a-zA-Z_][a-zA-Z0-9_.]*)/g,
    (_, varName) => `\${$get("${varName}")}`
  )

  // Restore placeholder
  processed = processed.replace(new RegExp(GET_PLACEHOLDER, 'g'), '$get')

  return processed
}

// ============================================
// MAIN CONTENT RESOLVER
// ============================================

/**
 * Resolve content value for code generation
 */
export function resolveContentValue(value: string | number | boolean): string {
  if (typeof value !== 'string') {
    return String(value)
  }

  // Loop variable reference
  if (isLoopVarReference(value)) {
    return extractLoopVarName(value)
  }

  // Computed expression from IR
  if (isComputedExpression(value)) {
    return resolveExpressionVariables(value)
  }

  // Simple $variable reference
  const simpleVar = isSimpleVarReference(value)
  if (simpleVar.match) {
    return `$get("${simpleVar.varName}")`
  }

  // String with $variables - needs interpolation
  if (hasDollarVars(value)) {
    const processed = resolveStringInterpolation(value)
    return `\`${escapeTemplateString(processed)}\``
  }

  // Handle $$ without other variables
  if (value.includes('$$')) {
    return `"${escapeString(value.replace(/\$\$/g, '$'))}"`
  }

  // Regular string literal
  return `"${escapeString(value)}"`
}

// ============================================
// CONDITION RESOLUTION
// ============================================

const JS_RESERVED = new Set([
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

const JS_METHOD_NAMES = new Set([
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

/**
 * Collect loop variable names from condition
 */
function collectLoopVars(condition: string): Set<string> {
  const loopVars = new Set<string>()
  condition.replace(/__loopVar:([a-zA-Z_][a-zA-Z0-9_.]*)/g, (_, varName) => {
    const baseName = varName.split('.')[0]
    loopVars.add(baseName)
    return ''
  })
  return loopVars
}

function resolveDollarVar(varPath: string): string {
  const parts = varPath.split('.')
  if (parts.length > 1 && JS_METHOD_NAMES.has(parts[parts.length - 1])) {
    return `$get("${parts.slice(0, -1).join('.')}").${parts[parts.length - 1]}`
  }
  return `$get("${varPath}")`
}

function resolveDollarVarsInCondition(condition: string): string {
  return condition.replace(
    /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*?)(?=\s*\(|$|[^a-zA-Z0-9_.])/g,
    (_, v) => resolveDollarVar(v)
  )
}

/**
 * Resolve bare identifiers in condition
 */
function resolveBareIdentifiers(condition: string, loopVars: Set<string>): string {
  return condition.replace(
    /(?<!["\w$.)])([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(?!["\w(])/g,
    (match, identifier) => {
      const firstPart = identifier.split('.')[0]
      if (JS_RESERVED.has(firstPart)) return match
      if (loopVars.has(firstPart)) return match
      return `$get("${identifier}")`
    }
  )
}

/**
 * Convert Mirror logical operators to JavaScript operators
 * and → &&, or → ||
 */
function convertMirrorOperators(condition: string): string {
  // Convert 'and' to '&&' and 'or' to '||'
  // Use word boundaries to avoid matching partial words
  return condition.replace(/\s+and\s+/g, ' && ').replace(/\s+or\s+/g, ' || ')
}

/**
 * Resolve condition variables for code generation
 */
export function resolveConditionVariables(condition: string): string {
  const loopVars = collectLoopVars(condition)

  // Strip __loopVar: prefix
  let result = resolveLoopVarMarkers(condition)

  // Convert Mirror operators (and/or) to JavaScript (&&/||)
  result = convertMirrorOperators(result)

  // Resolve $-prefixed variables
  result = resolveDollarVarsInCondition(result)

  // Resolve bare identifiers
  result = resolveBareIdentifiers(result, loopVars)

  return result
}

/**
 * Resolve loop condition - handles loop variables specially
 *
 * $-prefixed variables that reference the loop variable (`$task.done` when
 * itemVar is `task`) are stripped of their $ to use the local JS variable
 * directly. Other $-vars are wrapped in $get() for global data lookup.
 */
export function resolveLoopCondition(condition: string, itemVar: string, indexVar: string): string {
  return condition.replace(
    /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,
    (_match, path: string) => {
      const root = path.split('.')[0]
      if (root === itemVar || root === indexVar) return path
      return `$get("${path}")`
    }
  )
}
