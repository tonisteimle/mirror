/**
 * YAML Parser Module
 *
 * Simple YAML parser for data files in Mirror.
 * Supports: strings, numbers, booleans, arrays, objects.
 */

// ============================================
// TYPES
// ============================================

export type YAMLValue = string | number | boolean | null | YAMLObject | YAMLArray
export type YAMLObject = Record<string, YAMLValue>
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
    console.log(`[YAML] Loaded ${extractBaseName(filename)}:`, result)
    return result
  } catch (e) {
    console.warn(`[YAML] Failed to parse ${filename}:`, e)
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
