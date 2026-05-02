/**
 * YAML Parser Module
 *
 * Simple YAML parser for data files in Mirror.
 * Supports: strings, numbers, booleans, arrays, objects.
 */

import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('YAML')

// ============================================
// TYPES
// ============================================

export type YAMLValue = string | number | boolean | null | YAMLObject | YAMLArray
export interface YAMLObject {
  [key: string]: YAMLValue
}
export type YAMLArray = YAMLValue[]

export interface YAMLCollectorDeps {
  getFiles: () => Record<string, string>
}

// ============================================
// VALUE PARSING
// ============================================

export function parseYAMLValue(value: string): YAMLValue {
  if (isQuotedString(value)) return removeQuotes(value)
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null' || value === '~') return null
  return parseNumber(value)
}

function isQuotedString(value: string): boolean {
  return (
    (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
  )
}

function removeQuotes(value: string): string {
  return value.slice(1, -1)
}

function parseNumber(value: string): string | number {
  const num = Number(value)
  return !isNaN(num) && value !== '' ? num : value
}

// ============================================
// LINE PARSING
// ============================================

function isEmptyOrComment(line: string): boolean {
  const trimmed = line.trim()
  return !trimmed || trimmed.startsWith('#')
}

function isArrayItem(line: string): boolean {
  return line.trim().startsWith('- ')
}

function getIndent(line: string): number {
  return line.length - line.trimStart().length
}

// ============================================
// ARRAY ITEM PARSING
// ============================================

function parseArrayItem(trimmed: string, state: ParserState): void {
  const value = trimmed.slice(2).trim()

  if (value.includes(': ')) {
    parseInlineObject(value, state)
  } else {
    parseSimpleArrayItem(value, state)
  }
}

function parseInlineObject(value: string, state: ParserState): void {
  const obj: YAMLObject = {}
  value.split(', ').forEach(part => {
    const colonIdx = part.indexOf(': ')
    if (colonIdx > 0)
      obj[part.slice(0, colonIdx).trim()] = parseYAMLValue(part.slice(colonIdx + 2).trim())
  })
  ensureArray(state)
  state.currentArray!.push(obj)
}

function parseSimpleArrayItem(value: string, state: ParserState): void {
  ensureArray(state)
  state.currentArray!.push(parseYAMLValue(value))
}

function ensureArray(state: ParserState): void {
  if (!state.currentArray) {
    state.currentArray = []
    if (state.currentKey) {
      state.result[state.currentKey] = state.currentArray
    }
  }
}

// ============================================
// KEY-VALUE PARSING
// ============================================

interface ParserState {
  result: YAMLObject
  currentArray: YAMLArray | null
  currentKey: string
  currentIndent: number
}

function parseKeyValue(line: string, trimmed: string, state: ParserState): void {
  const colonIdx = trimmed.indexOf(':')
  if (colonIdx <= 0) return

  const key = trimmed.slice(0, colonIdx).trim()
  const value = trimmed.slice(colonIdx + 1).trim()
  const indent = getIndent(line)

  if (indent === 0) {
    parseTopLevelKey(key, value, state)
  } else if (indent > state.currentIndent && state.currentArray) {
    parseNestedProperty(key, value, state)
  }
}

function parseTopLevelKey(key: string, value: string, state: ParserState): void {
  state.currentKey = key
  state.currentArray = null
  state.currentIndent = 0

  if (value) {
    state.result[key] = parseYAMLValue(value)
  }
}

function parseNestedProperty(key: string, value: string, state: ParserState): void {
  const lastItem = state.currentArray![state.currentArray!.length - 1]
  if (typeof lastItem === 'object' && lastItem !== null && !Array.isArray(lastItem)) {
    ;(lastItem as YAMLObject)[key] = parseYAMLValue(value)
  }
}

// ============================================
// MAIN PARSER
// ============================================

export function parseYAML(text: string): YAMLValue {
  const lines = text.split('\n')
  const state: ParserState = {
    result: {},
    currentArray: null,
    currentKey: '',
    currentIndent: 0,
  }

  // First pass: detect if any top-level key has a nested-object body (a
  // bare `key:` at column 0 followed by indented `subkey:` lines, with no
  // `- ` array marker). The legacy code-path below only handles flat
  // key/value + arrays, which silently drops nested objects (common
  // mistake: `tasks:\n  t1:\n    title: "..."` parses to `{tasks:{}}`).
  // For sources that use nested objects, use an indent-stack parser
  // instead — it's a strict superset of the legacy form.
  if (hasNestedObjects(lines)) {
    return parseNestedYAML(lines)
  }

  for (const line of lines) {
    if (isEmptyOrComment(line)) continue

    const trimmed = line.trim()

    if (isArrayItem(trimmed)) {
      parseArrayItem(trimmed, state)
    } else {
      parseKeyValue(line, trimmed, state)
    }
  }

  return finalizeResult(state)
}

/**
 * True iff the source contains a `key:` line at column 0 that's followed
 * (after blank/comment lines) by an indented `subkey:` line — and there's
 * no `- ` array marker in between. That's the shape the flat parser
 * mishandles. Plain key:value pairs and key + array remain on the legacy
 * path so we don't change behaviour for sources that already worked.
 */
function hasNestedObjects(lines: readonly string[]): boolean {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isEmptyOrComment(line)) continue
    const trimmed = line.trim()
    if (getIndent(line) !== 0 || !trimmed.endsWith(':')) continue
    // Bare `key:` at column 0. Look ahead for an indented `subkey:` before
    // the next column-0 line or an array marker.
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j]
      if (isEmptyOrComment(next)) continue
      if (isArrayItem(next.trim())) break
      const indent = getIndent(next)
      if (indent === 0) break
      if (next.trim().endsWith(':')) return true
      if (next.trim().includes(': ')) {
        // Nested key:value also qualifies — flat parser drops these too
        // when the parent is `key:` (no value on parent line).
        return true
      }
      break
    }
  }
  return false
}

/**
 * Indent-stack parser for nested objects. Each line's indent maps to a
 * depth in the stack of "current parent objects". `key: value` becomes
 * a leaf at the current depth; bare `key:` opens a new nested object at
 * that depth + 1. Inline lists (`tags: [a, b, c]`) and arrays (`- ...`)
 * are NOT handled here — sources that use those shapes go down the
 * legacy path via hasNestedObjects() returning false.
 */
function parseNestedYAML(lines: readonly string[]): YAMLObject {
  const root: YAMLObject = {}
  // Stack entries: { obj: parent, indent: indentChars }. Top of stack is
  // the current parent.
  const stack: { obj: YAMLObject; indent: number }[] = [{ obj: root, indent: -1 }]

  for (const line of lines) {
    if (isEmptyOrComment(line)) continue
    const indent = getIndent(line)
    const trimmed = line.trim()

    // Pop the stack until we find a parent whose indent < current.
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }
    const parent = stack[stack.length - 1].obj

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx <= 0) continue
    const key = trimmed.slice(0, colonIdx).trim()
    const value = trimmed.slice(colonIdx + 1).trim()

    if (value === '') {
      // Bare `key:` — open a new nested object.
      const child: YAMLObject = {}
      parent[key] = child
      stack.push({ obj: child, indent })
    } else {
      // Leaf `key: value`.
      parent[key] = parseYAMLValue(value)
    }
  }
  return root
}

function finalizeResult(state: ParserState): YAMLValue {
  if (state.currentArray && Object.keys(state.result).length === 0) {
    return state.currentArray
  }
  return state.result
}

// ============================================
// COLLECTION & INJECTION
// ============================================

export function collectYAMLData(deps: YAMLCollectorDeps): Record<string, YAMLValue> {
  const allFiles = deps.getFiles()
  const yamlData: Record<string, YAMLValue> = {}

  for (const filename of Object.keys(allFiles)) {
    if (!isYAMLFile(filename)) continue

    const content = allFiles[filename]
    if (!content?.trim()) continue

    const name = extractBaseName(filename)
    const parsed = tryParseYAML(filename, content)
    if (parsed !== null) {
      yamlData[name] = parsed
    }
  }

  return yamlData
}

function isYAMLFile(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  return ext === '.yaml' || ext === '.yml'
}

function extractBaseName(filename: string): string {
  return filename.replace(/\.ya?ml$/i, '').replace(/^.*[/\\]/, '')
}

function tryParseYAML(filename: string, content: string): YAMLValue | null {
  try {
    const result = parseYAML(content)
    log.debug(`[YAML] Loaded ${extractBaseName(filename)}:`, result)
    return result
  } catch (e) {
    log.warn(`[YAML] Failed to parse ${filename}:`, e)
    return null
  }
}

export function generateYAMLDataInjection(deps: YAMLCollectorDeps): string {
  const yamlData = collectYAMLData(deps)
  if (Object.keys(yamlData).length === 0) return ''

  let code = '\n// Auto-loaded YAML data\n'
  for (const [name, data] of Object.entries(yamlData)) {
    code += `__mirrorData["${name}"] = ${JSON.stringify(data)};\n`
  }
  return code
}
