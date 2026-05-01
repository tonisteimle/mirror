/**
 * Two-Way Data Binding System
 *
 * Reactive data binding for inputs, text elements, and visibility.
 */

import type { MirrorElement } from './types'
import { refreshAllEachLoops } from './data'

// ============================================
// BINDING REGISTRIES
// ============================================

/** Elements bound to input values (two-way binding) */
const _valueBindings: Map<string, Set<MirrorElement>> = new Map()

/** Elements bound to text display (one-way binding) */
const _textBindings: Map<string, Set<MirrorElement>> = new Map()

/** Elements with visibility conditions depending on data */
const _visibilityBindings: Map<string, Set<MirrorElement>> = new Map()

// ============================================
// REGISTRATION FUNCTIONS
// ============================================

/**
 * Register an input element for two-way data binding
 */
export function bindValue(el: MirrorElement, path: string): void {
  el._valueBinding = path

  if (!_valueBindings.has(path)) {
    _valueBindings.set(path, new Set())
  }
  _valueBindings.get(path)!.add(el)
}

/**
 * Register a text element for one-way data binding
 */
export function bindText(el: MirrorElement, path: string): void {
  el._textBinding = path

  if (!_textBindings.has(path)) {
    _textBindings.set(path, new Set())
  }
  _textBindings.get(path)!.add(el)
}

/**
 * Register an element for visibility binding
 */
export function bindVisibility(el: MirrorElement, path: string): void {
  if (!el || !path) return

  if (!el._visibilityPaths) {
    el._visibilityPaths = []
  }
  el._visibilityPaths.push(path)

  if (!_visibilityBindings.has(path)) {
    _visibilityBindings.set(path, new Set())
  }
  _visibilityBindings.get(path)!.add(el)
}

/**
 * Unregister an element from two-way binding
 */
export function unbindValue(el: MirrorElement): void {
  const path = el._valueBinding
  if (path && _valueBindings.has(path)) {
    _valueBindings.get(path)!.delete(el)
  }
}

// ============================================
// PATH COLLECTION
// ============================================

/**
 * Find all sub-paths that need to be updated
 */
function collectPathsToUpdate(path: string): string[] {
  const paths = [path]
  const prefix = path + '.'

  for (const registered of _textBindings.keys()) {
    if (registered.startsWith(prefix)) {
      paths.push(registered)
    }
  }

  for (const registered of _valueBindings.keys()) {
    if (registered.startsWith(prefix) && !paths.includes(registered)) {
      paths.push(registered)
    }
  }

  for (const registered of _visibilityBindings.keys()) {
    if (registered.startsWith(prefix) && !paths.includes(registered)) {
      paths.push(registered)
    }
  }

  return paths
}

// ============================================
// VISIBILITY CONDITION EVALUATION
// ============================================

/**
 * Evaluate a visibility condition using $get for data lookup.
 * Supports both $-prefixed and bare identifier formats:
 *   - "loggedIn"   → $get("loggedIn")
 *   - "$loggedIn"  → $get("loggedIn")
 *   - "!loggedIn"  → !$get("loggedIn")
 *   - "count > 0"  → $get("count") > 0
 */
function evaluateVisibilityCondition(condition: string): boolean {
  try {
    const reserved = new Set([
      'true',
      'false',
      'null',
      'undefined',
      'NaN',
      'Infinity',
      'typeof',
      'instanceof',
      'new',
      'delete',
      'void',
    ])

    let evalCondition = condition.replace(/\$([a-zA-Z_][a-zA-Z0-9_.]*)/g, '$get("$1")')

    evalCondition = evalCondition.replace(
      /(?<!["\w$.])\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b(?!["\w(])/g,
      (match, identifier) => {
        const firstPart = identifier.split('.')[0]
        if (reserved.has(firstPart)) return match
        return `$get("${identifier}")`
      }
    )

    const $getFunc = (window as unknown as { $get: (path: string) => unknown }).$get
    const result = new Function('$get', 'return ' + evalCondition)($getFunc)
    return !!result
  } catch {
    return false
  }
}

// ============================================
// UPDATE FUNCTIONS
// ============================================

/**
 * Update bound input elements (skip focused to avoid cursor jump)
 */
function updateInputBindings(path: string, value: string): void {
  const elements = _valueBindings.get(path)
  if (!elements) return

  for (const el of elements) {
    if (el !== document.activeElement) {
      ;(el as HTMLInputElement).value = value
    }
  }
}

/**
 * Update bound text elements
 */
function updateTextBindings(path: string, value: string): void {
  const elements = _textBindings.get(path)
  if (!elements) return
  elements.forEach(el => {
    if (el._textTemplate) {
      try {
        el.textContent = el._textTemplate()
      } catch (e) {
        console.warn('Failed to re-evaluate text template:', e)
        el.textContent = value
      }
    } else el.textContent = value
  })
}

/**
 * Update visibility of bound elements
 */
function updateVisibilityBindings(path: string): void {
  const elements = _visibilityBindings.get(path)
  if (!elements) return

  for (const el of elements) {
    if (el._visibleWhen) {
      const visible = evaluateVisibilityCondition(el._visibleWhen)
      el.style.display = visible ? '' : 'none'
    }
  }
}

// ============================================
// MAIN NOTIFICATION FUNCTION
// ============================================

/**
 * Notify the runtime that data has changed at a specific path.
 * Updates all bound elements (inputs, text, visibility).
 */
export function notifyDataChange(path: string, value: unknown): void {
  const stringValue = value != null ? String(value) : ''
  const pathsToUpdate = collectPathsToUpdate(path)

  for (const updatePath of pathsToUpdate) {
    updateInputBindings(updatePath, stringValue)
    updateTextBindings(updatePath, stringValue)
    updateVisibilityBindings(updatePath)
  }

  // Refresh each loops as filters may depend on changed data
  refreshAllEachLoops()
}
