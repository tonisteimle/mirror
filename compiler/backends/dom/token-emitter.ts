/**
 * Token Emitter Module
 *
 * Handles generation of token and data initialization code.
 * Extracted from dom.ts for better maintainability.
 *
 * Responsibilities:
 * - __mirrorData initialization (tokens + data files)
 * - $get/$set helper functions
 * - $collection CRUD system
 * - $resolveRef for data relations
 * - $agg aggregation methods
 * - Collection methods from .data files
 */

import type { IR, IRToken } from '../../ir/types'
import { isIRDataReference, isIRDataReferenceArray } from '../../ir/types'
import type { DataFile } from '../../parser/data-types'
import { mergeDataFiles, serializeDataForJS } from '../../parser/data-parser'
import { escapeJSString } from './utils'

// =============================================================================
// Types
// =============================================================================

/**
 * Context for token emission.
 * Minimal subset of methods needed.
 */
export interface TokenEmitterContext {
  emit(line: string): void
  indentIn(): void
  indentOut(): void
}

/**
 * Data needed for token emission.
 */
export interface TokenEmitterData {
  tokens: IRToken[]
  dataFiles?: DataFile[]
}

// =============================================================================
// Main Emitter
// =============================================================================

/**
 * Emit all token and data initialization code.
 */
export function emitTokens(
  ctx: TokenEmitterContext,
  data: TokenEmitterData
): void {
  const { tokens, dataFiles } = data

  // Always emit __mirrorData and $get helper for $-variable support
  ctx.emit('// Mirror Data Context (Tokens + Data Files)')
  ctx.emit('// Exposed to window for debugging and two-way binding')
  ctx.emit('const __mirrorData = window.__mirrorData = {')
  ctx.indentIn()

  // Emit design tokens and inline data objects
  for (const token of tokens) {
    // Strip $ prefix, keep dots for object access
    const tokenKey = token.name.startsWith('$') ? token.name.slice(1) : token.name

    if (token.value !== undefined) {
      // Simple token with value
      const value = typeof token.value === 'string' ? `"${escapeJSString(token.value)}"` : token.value
      ctx.emit(`"${tokenKey}": ${value},`)
    } else if (token.data !== undefined) {
      // Inline data object - serialize nested structure
      const dataJS = serializeDataObject(token.data)
      ctx.emit(`"${tokenKey}": ${dataJS},`)
    }
  }

  // Emit data files (from .data parser)
  if (dataFiles && dataFiles.length > 0) {
    const mergedData = mergeDataFiles(dataFiles)
    const dataJS = serializeDataForJS(mergedData)
    // Each line of dataJS needs to be emitted
    for (const line of dataJS.split('\n')) {
      ctx.emit(line)
    }
  }

  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')

  // Emit collection store
  emitCollectionStore(ctx)

  // Emit reference resolver
  emitReferenceResolver(ctx)

  // Emit aggregation helpers
  emitAggregationHelpers(ctx)

  // Collection methods (from .data files)
  emitMethods(ctx, dataFiles)

  // Computed queries (feature removed - no-op)
  emitQueries(ctx)

  // $get helper
  emitGetHelper(ctx)

  // $set helper
  emitSetHelper(ctx)

  // Legacy tokens object for CSS variable generation
  if (tokens.length > 0) {
    ctx.emit('// Design Tokens (for CSS variables)')
    ctx.emit('const tokens = __mirrorData')
    ctx.emit('')
  }
}

// =============================================================================
// Collection Store
// =============================================================================

function emitCollectionStore(ctx: TokenEmitterContext): void {
  ctx.emit('// Collection Store for reactive CRUD')
  ctx.emit('const __collections = window.__collections = {}')
  ctx.emit('function $collection(name) {')
  ctx.indentIn()
  ctx.emit('const n = name.startsWith("$") ? name.slice(1) : name')
  ctx.emit('if (!__collections[n]) {')
  ctx.indentIn()
  ctx.emit('const items = __mirrorData[n] || []')
  ctx.emit('const itemsArray = Array.isArray(items) ? items : Object.values(items)')
  ctx.emit('__collections[n] = {')
  ctx.indentIn()
  ctx.emit('items: itemsArray,')
  ctx.emit('_current: null,')
  ctx.emit('_subscribers: new Set(),')
  ctx.emit('get current() { return this._current },')
  ctx.emit('set current(item) {')
  ctx.indentIn()
  ctx.emit('if (this._current === item) return')
  ctx.emit('this._current = item')
  ctx.emit('this._subscribers.forEach(fn => fn())')
  ctx.indentOut()
  ctx.emit('},')
  ctx.emit('subscribe(fn) { this._subscribers.add(fn); return () => this._subscribers.delete(fn) },')
  ctx.emit('add(item) {')
  ctx.indentIn()
  ctx.emit('const newItem = { id: item.id || Date.now().toString(36), ...item }')
  ctx.emit('this.items.push(newItem)')
  ctx.emit('this._subscribers.forEach(fn => fn())')
  ctx.emit('return newItem')
  ctx.indentOut()
  ctx.emit('},')
  ctx.emit('remove(item) {')
  ctx.indentIn()
  ctx.emit('const idx = this.items.indexOf(item)')
  ctx.emit('if (idx > -1) this.items.splice(idx, 1)')
  ctx.emit('if (this._current === item) this._current = null')
  ctx.emit('this._subscribers.forEach(fn => fn())')
  ctx.indentOut()
  ctx.emit('},')
  ctx.emit('update(item, changes) {')
  ctx.indentIn()
  ctx.emit('Object.assign(item, changes)')
  ctx.emit('this._subscribers.forEach(fn => fn())')
  ctx.indentOut()
  ctx.emit('}')
  ctx.indentOut()
  ctx.emit('}')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('return __collections[n]')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')
}

// =============================================================================
// Reference Resolver
// =============================================================================

function emitReferenceResolver(ctx: TokenEmitterContext): void {
  ctx.emit('// Reference resolver for data relations')
  ctx.emit('function $resolveRef(value) {')
  ctx.indentIn()
  ctx.emit('if (value && typeof value === "object" && value.__ref) {')
  ctx.indentIn()
  ctx.emit('const resolved = __mirrorData[value.collection]?.[value.entry]')
  ctx.emit('return resolved !== undefined ? resolved : value')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('if (Array.isArray(value)) {')
  ctx.indentIn()
  ctx.emit('return value.map(v => $resolveRef(v))')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('return value')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')
}

// =============================================================================
// Aggregation Helpers
// =============================================================================

function emitAggregationHelpers(ctx: TokenEmitterContext): void {
  ctx.emit('// Aggregation methods for collections')
  ctx.emit('// Helper to get nested property value: "data.stats.value" -> obj.data.stats.value')
  ctx.emit('const $getField = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj)')
  ctx.emit('const $agg = {')
  ctx.indentIn()
  ctx.emit('count: (arr) => Array.isArray(arr) ? arr.length : 0,')
  ctx.emit('sum: (arr, field) => Array.isArray(arr) ? arr.reduce((s, i) => s + (Number($getField(i, field)) || 0), 0) : 0,')
  ctx.emit('avg: (arr, field) => { const a = Array.isArray(arr) ? arr : []; return a.length ? $agg.sum(a, field) / a.length : 0 },')
  ctx.emit('min: (arr, field) => Array.isArray(arr) && arr.length ? Math.min(...arr.map(i => Number($getField(i, field)) || 0)) : 0,')
  ctx.emit('max: (arr, field) => Array.isArray(arr) && arr.length ? Math.max(...arr.map(i => Number($getField(i, field)) || 0)) : 0,')
  ctx.emit('first: (arr) => Array.isArray(arr) ? arr[0] : undefined,')
  ctx.emit('last: (arr) => Array.isArray(arr) ? arr[arr.length - 1] : undefined,')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')
}

// =============================================================================
// $get Helper
// =============================================================================

function emitGetHelper(ctx: TokenEmitterContext): void {
  ctx.emit('// $-variable accessor with aggregation support')
  ctx.emit('function $get(name) {')
  ctx.indentIn()

  // Check for aggregation method pattern
  ctx.emit('// Check for aggregation pattern: collection.count, collection.sum(field), items.first.name')
  ctx.emit('const aggMatch = name.match(/^(.+)\\.(count|sum|avg|min|max|first|last)(?:\\(([^)]+)\\))?(\\..+)?$/)')
  ctx.emit('if (aggMatch) {')
  ctx.indentIn()
  ctx.emit('const [, collectionPath, method, field, postAccessor] = aggMatch')
  ctx.emit('const collection = $get(collectionPath)')
  ctx.emit('if (Array.isArray(collection)) {')
  ctx.indentIn()
  ctx.emit('let result = field ? $agg[method](collection, field) : $agg[method](collection)')
  ctx.emit('// Handle post-accessor like .name after .first')
  ctx.emit('if (postAccessor && result != null) {')
  ctx.indentIn()
  ctx.emit('const accessParts = postAccessor.slice(1).split(".")')
  ctx.emit('for (const part of accessParts) {')
  ctx.indentIn()
  ctx.emit('if (result == null) break')
  ctx.emit('result = result[part]')
  ctx.indentOut()
  ctx.emit('}')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('return result')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('return 0')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')

  // Check for .current pattern
  ctx.emit('// Check for .current pattern (CRUD selection)')
  ctx.emit('const currentMatch = name.match(/^([^.]+)\\.current(\\..*)?$/)')
  ctx.emit('if (currentMatch) {')
  ctx.indentIn()
  ctx.emit('const [, collectionName, postAccessor] = currentMatch')
  ctx.emit('const coll = $collection(collectionName)')
  ctx.emit('let result = coll.current')
  ctx.emit('if (postAccessor && result != null) {')
  ctx.indentIn()
  ctx.emit('const accessParts = postAccessor.slice(1).split(".")')
  ctx.emit('for (const part of accessParts) {')
  ctx.indentIn()
  ctx.emit('if (result == null) break')
  ctx.emit('result = result[part]')
  ctx.indentOut()
  ctx.emit('}')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('return result')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')

  // Check _mirrorState
  ctx.emit('if (window._mirrorState && name in window._mirrorState) return window._mirrorState[name]')
  ctx.emit('')

  // Nested access
  ctx.emit('if (name in __mirrorData) return $resolveRef(__mirrorData[name])')
  ctx.emit('const parts = name.split(".")')
  ctx.emit('let val = __mirrorData[parts[0]] ?? globalThis[parts[0]]')
  ctx.emit('for (let i = 1; i < parts.length && val != null; i++) {')
  ctx.indentIn()
  ctx.emit('val = $resolveRef(val[parts[i]])')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('return val')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')
}

// =============================================================================
// $set Helper
// =============================================================================

function emitSetHelper(ctx: TokenEmitterContext): void {
  ctx.emit('// $-variable mutator (two-way binding)')
  ctx.emit('function $set(path, value) {')
  ctx.indentIn()
  ctx.emit('if (path in __mirrorData) {')
  ctx.indentIn()
  ctx.emit('__mirrorData[path] = value')
  ctx.indentOut()
  ctx.emit('} else {')
  ctx.indentIn()
  ctx.emit('const parts = path.split(".")')
  ctx.emit('let obj = __mirrorData')
  ctx.emit('for (let i = 0; i < parts.length - 1; i++) {')
  ctx.indentIn()
  ctx.emit('if (obj[parts[i]] === undefined) obj[parts[i]] = {}')
  ctx.emit('obj = obj[parts[i]]')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('obj[parts[parts.length - 1]] = value')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('// Notify runtime of data change for reactive updates')
  ctx.emit('if (_runtime && _runtime.notifyDataChange) _runtime.notifyDataChange(path, value)')
  ctx.indentOut()
  ctx.emit('}')
  ctx.emit('')
}

// =============================================================================
// Collection Methods
// =============================================================================

/**
 * Emit collection methods from .data files.
 */
export function emitMethods(
  ctx: TokenEmitterContext,
  dataFiles?: DataFile[]
): void {
  if (!dataFiles || dataFiles.length === 0) return

  // Collect all methods from all data files
  const allMethods = dataFiles.flatMap(df => df.methods || [])
  if (allMethods.length === 0) return

  ctx.emit('// Collection methods from .data files')
  ctx.emit('const __methods = {}')

  // Group methods by namespace
  const byNamespace = new Map<string, typeof allMethods>()
  for (const method of allMethods) {
    const existing = byNamespace.get(method.namespace) || []
    existing.push(method)
    byNamespace.set(method.namespace, existing)
  }

  // Emit each namespace
  for (const [namespace, methods] of byNamespace) {
    ctx.emit(`__methods.${namespace} = {}`)

    for (const method of methods) {
      const params = method.params.join(', ')
      ctx.emit(`__methods.${namespace}.${method.name} = function(${params}) {`)
      ctx.indentIn()

      // Compile the raw body to JavaScript
      const bodyLines = method.rawBody.split('\n')
      for (const line of bodyLines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        const jsLine = compileMethodBodyLine(trimmed)
        ctx.emit(jsLine)
      }

      ctx.indentOut()
      ctx.emit('}')
    }
  }
  ctx.emit('')
}

/**
 * Compile a single line of method body to JavaScript.
 */
function compileMethodBodyLine(line: string): string {
  let result = line

  // Replace $collection with $get('collection')
  result = result.replace(/\$([a-zA-Z][\w-]*)/g, (_, name) => {
    return `$get('${name}')`
  })

  return result
}

/**
 * Generate computed queries (feature removed - no-op).
 */
export function emitQueries(_ctx: TokenEmitterContext): void {
  // Query files feature has been removed - this is now a no-op
}

// =============================================================================
// Data Serialization Helpers
// =============================================================================

/**
 * Serialize an inline data object to JavaScript code.
 * Handles nested structures and references.
 */
export function serializeDataObject(data: Record<string, unknown>): string {
  const entries: string[] = []

  for (const [key, value] of Object.entries(data)) {
    const serializedValue = serializeDataValue(value)
    entries.push(`"${key}": ${serializedValue}`)
  }

  return `{ ${entries.join(', ')} }`
}

/**
 * Serialize a single data value to JavaScript code.
 */
export function serializeDataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'string') {
    return `"${escapeJSString(value)}"`
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    // String array or reference array
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && '__ref' in value[0]) {
      // Reference array
      const refs = value.map(ref => serializeDataValue(ref))
      return `[${refs.join(', ')}]`
    }
    // Regular string array
    const items = value.map(item => typeof item === 'string' ? `"${escapeJSString(item)}"` : String(item))
    return `[${items.join(', ')}]`
  }

  if (typeof value === 'object') {
    // Check for reference
    if (isIRDataReference(value)) {
      return `{ __ref: true, collection: "${value.collection}", entry: "${value.entry}" }`
    }

    // Check for reference array
    if (isIRDataReferenceArray(value)) {
      const refs = value.references.map(ref =>
        `{ __ref: true, collection: "${ref.collection}", entry: "${ref.entry}" }`
      )
      return `[${refs.join(', ')}]`
    }

    // Nested object - recurse
    return serializeDataObject(value as Record<string, unknown>)
  }

  return 'null'
}
