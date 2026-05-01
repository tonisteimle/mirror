/**
 * Data Management System
 *
 * YAML data loading, state management, and CRUD operations.
 */

import type { MirrorElement } from './types'

// ============================================
// DEBUG MODE
// ============================================

const isDebug = (): boolean => typeof window !== 'undefined' && window.__MIRROR_DEBUG__ === true

// ============================================
// GLOBAL DATA STORES
// ============================================

declare global {
  interface Window {
    __mirrorData?: Record<string, unknown>
    _mirrorState?: Record<string, unknown>
    __MIRROR_DEBUG__?: boolean
  }
}

function getMirrorData(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  window.__mirrorData = window.__mirrorData || {}
  return window.__mirrorData
}

function getMirrorState(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  window._mirrorState = window._mirrorState || {}
  return window._mirrorState
}

// ============================================
// YAML PARSING
// ============================================

/**
 * Parse a YAML value (string, number, boolean, null)
 */
function parseYAMLValue(value: string): unknown {
  // Remove quotes
  if (isQuotedString(value)) {
    return value.slice(1, -1)
  }

  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null' || value === '~') return null

  const num = Number(value)
  if (!isNaN(num) && value !== '') return num

  return value
}

function isQuotedString(value: string): boolean {
  return (
    (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
  )
}

/**
 * Parse inline object from YAML array item
 */
function parseInlineObject(value: string): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  const parts = value.split(', ')

  for (const part of parts) {
    const colonIdx = part.indexOf(': ')
    if (colonIdx > 0) {
      const k = part.slice(0, colonIdx).trim()
      const v = parseYAMLValue(part.slice(colonIdx + 2).trim())
      obj[k] = v
    }
  }

  return obj
}

interface YAMLParseState {
  result: Record<string, unknown>
  currentArray: unknown[] | null
  currentKey: string
  currentIndent: number
}

/**
 * Process a single YAML line
 */
function processYAMLLine(line: string, state: YAMLParseState): void {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return

  if (trimmed.startsWith('- ')) {
    processArrayItem(trimmed.slice(2).trim(), state)
    return
  }

  const colonIdx = trimmed.indexOf(':')
  if (colonIdx > 0) {
    processKeyValue(line, trimmed, colonIdx, state)
  }
}

function ensureArray(state: YAMLParseState): void {
  if (!state.currentArray) {
    state.currentArray = []
    if (state.currentKey) state.result[state.currentKey] = state.currentArray
  }
}

function processArrayItem(value: string, state: YAMLParseState): void {
  ensureArray(state)
  state.currentArray!.push(value.includes(': ') ? parseInlineObject(value) : parseYAMLValue(value))
}

/**
 * Process key-value pair in YAML
 */
function processKeyValue(
  line: string,
  trimmed: string,
  colonIdx: number,
  state: YAMLParseState
): void {
  const key = trimmed.slice(0, colonIdx).trim()
  const value = trimmed.slice(colonIdx + 1).trim()
  const indent = line.length - line.trimStart().length

  if (indent === 0) {
    state.currentKey = key
    state.currentArray = null
    state.currentIndent = indent
    if (value) state.result[key] = parseYAMLValue(value)
  } else if (indent > state.currentIndent && state.currentArray) {
    const lastItem = state.currentArray[state.currentArray.length - 1]
    if (typeof lastItem === 'object' && lastItem !== null) {
      ;(lastItem as Record<string, unknown>)[key] = parseYAMLValue(value)
    }
  }
}

/**
 * Simple YAML parser for common data structures
 */
function parseSimpleYAML(text: string): unknown {
  const lines = text.split('\n')
  const state: YAMLParseState = {
    result: {},
    currentArray: null,
    currentKey: '',
    currentIndent: 0,
  }

  for (const line of lines) {
    processYAMLLine(line, state)
  }

  if (state.currentArray && Object.keys(state.result).length === 0) {
    return state.currentArray
  }

  return state.result
}

// ============================================
// FILE SECURITY
// ============================================

/**
 * Sanitize filename to prevent path traversal
 */
function sanitizeFilename(name: string): string | null {
  if (!name || typeof name !== 'string') return null

  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    console.warn('[Security] Path traversal in filename blocked:', name)
    return null
  }

  if (!/^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$/.test(name)) {
    console.warn('[Security] Invalid filename characters:', name)
    return null
  }

  return name
}

// ============================================
// YAML FILE LOADING
// ============================================

/**
 * Load a single YAML file and add to __mirrorData
 */
export async function loadYAMLFile(filename: string, basePath = '/data/'): Promise<void> {
  const safeFilename = sanitizeFilename(filename)
  if (!safeFilename) return

  try {
    const url = basePath + safeFilename
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`YAML file not found: ${url}`)
      return
    }

    const text = await response.text()
    const data = parseSimpleYAML(text)
    const name = safeFilename.replace(/\.ya?ml$/i, '')

    const mirrorData = getMirrorData()
    mirrorData[name] = data

    if (isDebug()) console.log(`[Mirror] Loaded YAML: ${name}`, data)
  } catch (err) {
    console.warn(`Failed to load YAML file ${safeFilename}:`, err)
  }
}

/**
 * Load multiple YAML files from data/ directory
 */
export async function loadYAMLFiles(filenames: string[], basePath = '/data/'): Promise<void> {
  await Promise.all(filenames.map(f => loadYAMLFile(f, basePath)))
}

/**
 * Auto-discover and load YAML files from data/ directory
 */
export async function loadMirrorData(basePath = '/data/', manifest?: string[]): Promise<void> {
  if (manifest?.length) {
    await loadYAMLFiles(manifest, basePath)
    return
  }
  try {
    const res = await fetch(basePath + 'manifest.json')
    if (res.ok) await loadYAMLFiles((await res.json()) as string[], basePath)
  } catch {
    /* No manifest available - OK */
  }
}

// ============================================
// STATE OPERATIONS
// ============================================

export interface CounterOptions {
  min?: number
  max?: number
  step?: number
}

/**
 * Get the current value of a token
 */
export function get(tokenName: string): unknown {
  const name = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
  return getMirrorState()[name]
}

/**
 * Set a token to a specific value
 */
export function set(tokenName: string, value: unknown): void {
  const name = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
  getMirrorState()[name] = value
  updateBoundTokenElements(name, value)
}

/**
 * Adjust a numeric token by delta * step, enforcing both min and max bounds.
 */
function adjustCounter(tokenName: string, delta: number, options?: CounterOptions): void {
  const name = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
  const state = getMirrorState()
  const { min, max, step = 1 } = options || {}

  const current = typeof state[name] === 'number' ? (state[name] as number) : 0
  let newValue = current + delta * step

  if (max !== undefined && newValue > max) newValue = max
  if (min !== undefined && newValue < min) newValue = min

  state[name] = newValue
  updateBoundTokenElements(name, newValue)
}

/**
 * Increment a numeric token (enforces both min and max bounds if provided)
 */
export function increment(tokenName: string, options?: CounterOptions): void {
  adjustCounter(tokenName, 1, options)
}

/**
 * Decrement a numeric token (enforces both min and max bounds if provided)
 */
export function decrement(tokenName: string, options?: CounterOptions): void {
  adjustCounter(tokenName, -1, options)
}

/**
 * Reset a token to its initial value
 */
export function reset(tokenName: string, initialValue: unknown = 0): void {
  set(tokenName, initialValue)
}

// ============================================
// BOUND ELEMENTS UPDATE
// ============================================

/**
 * Update element with token binding
 */
function updateTextElement(el: HTMLElement, value: unknown): void {
  const tag = el.tagName
  if (tag === 'SPAN' || tag === 'DIV' || tag === 'P') {
    el.textContent = String(value)
  }
  if (tag === 'INPUT') {
    ;(el as HTMLInputElement).value = String(value)
  }
}

/**
 * Update all elements bound to a token
 */
function updateBoundTokenElements(tokenName: string, value: unknown): void {
  const elements = document.querySelectorAll(
    `[data-token-binding="${tokenName}"], [data-mirror-token="${tokenName}"]`
  )

  elements.forEach(el => updateTextElement(el as HTMLElement, value))

  const boundElements = document.querySelectorAll('[data-mirror-id]') as NodeListOf<MirrorElement>
  boundElements.forEach(el => {
    if (el._textBinding === tokenName || el._textBinding === '$' + tokenName) {
      el.textContent = String(value)
    }
  })
}

// ============================================
// CRUD OPERATIONS
// ============================================

let _idCounter = 0

/**
 * Generate a unique ID for new entries
 */
function generateEntryId(prefix = 'item'): string {
  _idCounter = (_idCounter + 1) % 100000
  const random = Math.random().toString(36).slice(2, 6)
  return `${prefix}_${Date.now()}_${_idCounter}_${random}`
}

/**
 * Add a new entry to a collection
 */
export function add(collectionName: string, values?: Record<string, unknown>): string {
  const name = collectionName.startsWith('$') ? collectionName.slice(1) : collectionName
  const data = getMirrorData()
  const key = generateEntryId(name.slice(0, 3))
  const entry = { _key: key, ...(values || {}) }
  if (Array.isArray(data[name])) {
    ;(data[name] as unknown[]).push(entry)
  } else {
    if (!data[name] || typeof data[name] !== 'object') data[name] = {}
    ;(data[name] as Record<string, unknown>)[key] = entry
  }
  refreshEachLoops(name)
  return key
}

/**
 * Remove an entry from a collection
 */
export function remove(itemOrKey: unknown): void {
  if (!itemOrKey) {
    console.warn('[Mirror] remove() called with null/undefined')
    return
  }

  if (typeof itemOrKey !== 'object') return

  const item = itemOrKey as Record<string, unknown>
  if (typeof item._key !== 'string') {
    console.warn('[Mirror] remove() called with item without _key')
    return
  }

  const entryKey = item._key
  const data = getMirrorData()

  for (const [collectionName, collectionData] of Object.entries(data)) {
    if (!collectionData || typeof collectionData !== 'object') continue
    if (Array.isArray(collectionData)) continue

    const col = collectionData as Record<string, unknown>
    if (col[entryKey]) {
      delete col[entryKey]
      refreshEachLoops(collectionName)
      return
    }
  }

  console.warn(`[Mirror] remove() could not find item with key "${entryKey}"`)
}

/**
 * Infer default value from template value type
 */
function getDefaultValue(templateValue: unknown): unknown {
  if (typeof templateValue === 'string') return ''
  if (typeof templateValue === 'number') return 0
  if (typeof templateValue === 'boolean') return false
  if (Array.isArray(templateValue)) return []
  if (templateValue && typeof templateValue === 'object') return {}
  return null
}

/**
 * Create a new entry in a collection
 */
export function create(
  collectionName: string,
  initialValues?: Record<string, unknown>
): Record<string, unknown> | null {
  const data = getMirrorData()
  const collection = data[collectionName]

  if (!collection || typeof collection !== 'object' || Array.isArray(collection)) {
    console.warn(`[Mirror] create() - collection "${collectionName}" not found or invalid`)
    return null
  }

  const newKey = `new_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const existingEntries = Object.values(collection as Record<string, unknown>)
  const template = existingEntries[0] as Record<string, unknown> | undefined
  const newEntry: Record<string, unknown> = { _key: newKey }

  if (template) {
    for (const key of Object.keys(template)) {
      if (key !== '_key') {
        newEntry[key] = getDefaultValue(template[key])
      }
    }
  }

  if (initialValues) {
    Object.assign(newEntry, initialValues)
  }

  ;(collection as Record<string, unknown>)[newKey] = newEntry
  refreshEachLoops(collectionName)

  return newEntry
}

/**
 * Save changes to the current data
 */
export function save(target?: string): void {
  const data = getMirrorData()
  if (isDebug()) console.log('[Mirror] save() called', target ? `for ${target}` : '', data)

  window.dispatchEvent(
    new CustomEvent('mirror:save', {
      detail: { target, data },
    })
  )
}

/**
 * Delete an item from its collection
 */
export function deleteItem(itemOrKey: unknown): void {
  remove(itemOrKey)
}

/**
 * Revert changes to an entry
 */
export function revert(target?: string): void {
  if (isDebug()) console.log('[Mirror] revert() called', target ? `for ${target}` : '')

  window.dispatchEvent(
    new CustomEvent('mirror:revert', {
      detail: { target },
    })
  )
}

// ============================================
// FIELD UPDATES
// ============================================

/**
 * Set a nested field value using dot notation path
 */
function setNestedField(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (current[part] === undefined || current[part] === null) {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }

  current[parts[parts.length - 1]] = value
}

/**
 * Update a field in an item
 */
export function updateField(item: Record<string, unknown>, field: string, value: unknown): void {
  if (typeof item._key !== 'string') {
    console.warn('[Mirror] updateField() called with item without _key')
    return
  }

  const data = getMirrorData()
  const entryKey = item._key

  for (const [collectionName, collectionData] of Object.entries(data)) {
    if (!collectionData || typeof collectionData !== 'object') continue
    if (Array.isArray(collectionData)) continue

    const col = collectionData as Record<string, unknown>
    if (!col[entryKey]) continue

    const entry = col[entryKey] as Record<string, unknown>

    if (field.includes('.')) {
      setNestedField(entry, field, value)
      setNestedField(item, field, value)
    } else {
      entry[field] = value
      item[field] = value
    }

    refreshEachLoops(collectionName)
    return
  }

  console.warn(`[Mirror] Could not find item with key "${entryKey}" in any collection`)
}

/**
 * Setup editable behavior on a text element
 */
export function setupEditable(
  element: HTMLElement,
  item: Record<string, unknown>,
  field: string
): void {
  element.addEventListener('dblclick', () => {
    element.contentEditable = 'true'
    element.focus()

    const handleBlur = () => {
      element.contentEditable = 'false'
      const newValue = element.textContent || ''
      updateField(item, field, newValue)
      element.removeEventListener('blur', handleBlur)
    }

    element.addEventListener('blur', handleBlur)
  })
}

// ============================================
// EACH LOOP REFRESH
// ============================================

interface EachConfig {
  collection: string
  renderItem?: (item: unknown, index: number) => HTMLElement
  filterFn?: (item: Record<string, unknown>) => boolean
  orderBy?: string
  orderDesc?: boolean
}

/**
 * Convert collection to array with keys
 */
function collectionToArray(items: unknown): Record<string, unknown>[] {
  if (Array.isArray(items)) {
    return items as Record<string, unknown>[]
  }

  return Object.entries(items as Record<string, unknown>).map(([k, v]) =>
    typeof v === 'object' && v !== null ? { _key: k, ...(v as object) } : { _key: k, value: v }
  )
}

/**
 * Apply filter and sort to items array
 */
function applyFilterAndSort(
  items: Record<string, unknown>[],
  config: EachConfig
): Record<string, unknown>[] {
  let result = items

  if (config.filterFn) {
    result = result.filter(config.filterFn)
  }

  if (config.orderBy) {
    const sortDir = config.orderDesc ? -1 : 1
    const key = config.orderBy
    result = [...result].sort((a, b) => {
      const aVal = a[key] as string | number
      const bVal = b[key] as string | number
      if (aVal < bVal) return -sortDir
      if (aVal > bVal) return sortDir
      return 0
    })
  }

  return result
}

/**
 * Re-render all each loops that use a specific collection
 */
function refreshContainers(filterCollection?: string): void {
  const containers = document.querySelectorAll('[data-each-container]') as NodeListOf<MirrorElement>
  const data = getMirrorData()
  containers.forEach(container => {
    const config = container._eachConfig as EachConfig | undefined
    if (!config) return
    const collectionName = typeof config.collection === 'string' ? config.collection : null
    if (!collectionName || (filterCollection && collectionName !== filterCollection)) return
    container.innerHTML = ''
    const items = data[collectionName]
    if (!items || typeof items !== 'object') return
    const itemsArray = applyFilterAndSort(collectionToArray(items), config)
    if (config.renderItem)
      itemsArray.forEach((item, i) => container.appendChild(config.renderItem!(item, i)))
  })
}

export function refreshEachLoops(collectionName: string): void {
  refreshContainers(collectionName)
}

/** Refresh all each loops in the document */
export function refreshAllEachLoops(): void {
  refreshContainers()
}
