/**
 * DOM Backend Utilities
 *
 * Helper functions for DOM code generation.
 */

/**
 * Escape a string for safe inclusion in JavaScript code
 * Handles quotes, backslashes, newlines, and other special characters
 */
export function escapeJSString(s: string): string {
  return s
    .replace(/\\/g, '\\\\') // backslash first!
    .replace(/'/g, "\\'") // single quotes
    .replace(/"/g, '\\"') // double quotes
    .replace(/\n/g, '\\n') // newlines
    .replace(/\r/g, '\\r') // carriage returns
    .replace(/\t/g, '\\t') // tabs
    .replace(/\0/g, '\\0') // null bytes
    .replace(/\u2028/g, '\\u2028') // line separator
    .replace(/\u2029/g, '\\u2029') // paragraph separator
}

const JS_RESERVED = new Set([
  'break',
  'case',
  'catch',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'finally',
  'for',
  'function',
  'if',
  'in',
  'instanceof',
  'new',
  'return',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'class',
  'const',
  'enum',
  'export',
  'extends',
  'import',
  'super',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  'null',
  'true',
  'false',
])

export function sanitizeVarName(id: string): string {
  let s = id.replace(/[^a-zA-Z0-9_]/g, '_')
  if (/^[0-9]/.test(s)) s = '_' + s
  if (JS_RESERVED.has(s.toLowerCase())) s = '_' + s
  return s
}

/**
 * Convert a CSS property name to JavaScript style property name
 * e.g., 'background-color' -> 'backgroundColor'
 */
export function cssPropertyToJS(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Generate a unique variable name for a node
 */
export function generateVarName(nodeId: string, prefix: string = ''): string {
  const sanitized = sanitizeVarName(nodeId)
  return prefix ? `${prefix}_${sanitized}` : sanitized
}
