/**
 * Intent Diff Module
 *
 * Provides JSON Patch operations for efficient intent updates.
 * Instead of replacing the entire intent, only changes are transmitted.
 */

import type { Intent, LayoutNode, ComponentDefinition } from './schema'

// =============================================================================
// JSON Patch Types (RFC 6902)
// =============================================================================

export interface PatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test'
  path: string
  value?: unknown
  from?: string
}

export type Patch = PatchOperation[]

// =============================================================================
// Diff Generation
// =============================================================================

/**
 * Generates a JSON Patch from old intent to new intent
 */
export function generatePatch(oldIntent: Intent, newIntent: Intent): Patch {
  const patch: Patch = []

  // Diff tokens
  diffTokens(oldIntent.tokens, newIntent.tokens, '/tokens', patch)

  // Diff components
  diffArray(
    oldIntent.components,
    newIntent.components,
    '/components',
    patch,
    (a, b) => a.name === b.name
  )

  // Diff layout
  diffLayoutNodes(
    oldIntent.layout,
    newIntent.layout,
    '/layout',
    patch
  )

  return patch
}

function diffTokens(
  oldTokens: Intent['tokens'],
  newTokens: Intent['tokens'],
  basePath: string,
  patch: Patch
): void {
  const categories = ['colors', 'spacing', 'radii', 'sizes'] as const

  for (const category of categories) {
    const oldCat = oldTokens?.[category] || {}
    const newCat = newTokens?.[category] || {}
    const path = `${basePath}/${category}`

    // Check for removed keys
    for (const key of Object.keys(oldCat)) {
      if (!(key in newCat)) {
        patch.push({ op: 'remove', path: `${path}/${key}` })
      }
    }

    // Check for added or changed keys
    for (const [key, value] of Object.entries(newCat)) {
      if (!(key in oldCat)) {
        patch.push({ op: 'add', path: `${path}/${key}`, value })
      } else if (oldCat[key] !== value) {
        patch.push({ op: 'replace', path: `${path}/${key}`, value })
      }
    }
  }
}

function diffArray<T>(
  oldArr: T[],
  newArr: T[],
  basePath: string,
  patch: Patch,
  isEqual: (a: T, b: T) => boolean
): void {
  // Simple diff: detect adds, removes, and replacements
  const maxLen = Math.max(oldArr.length, newArr.length)

  for (let i = 0; i < maxLen; i++) {
    const path = `${basePath}/${i}`

    if (i >= oldArr.length) {
      // New item added
      patch.push({ op: 'add', path, value: newArr[i] })
    } else if (i >= newArr.length) {
      // Item removed (process in reverse to maintain indices)
      patch.push({ op: 'remove', path: `${basePath}/${oldArr.length - 1 - (i - newArr.length)}` })
    } else if (!isEqual(oldArr[i], newArr[i])) {
      // Item changed
      patch.push({ op: 'replace', path, value: newArr[i] })
    }
  }
}

function diffLayoutNodes(
  oldNodes: LayoutNode[],
  newNodes: LayoutNode[],
  basePath: string,
  patch: Patch
): void {
  // For layout nodes, we compare by id or component+text
  const nodeKey = (n: LayoutNode) => n.id || `${n.component}:${n.text || ''}`

  diffArray(oldNodes, newNodes, basePath, patch, (a, b) => {
    // Deep comparison for layout nodes
    return JSON.stringify(a) === JSON.stringify(b)
  })
}

// =============================================================================
// Patch Application
// =============================================================================

/**
 * Applies a JSON Patch to an intent
 */
export function applyPatch(intent: Intent, patch: Patch): Intent {
  // Deep clone the intent
  const result = JSON.parse(JSON.stringify(intent)) as Intent

  for (const op of patch) {
    applyOperation(result as unknown as Record<string, unknown>, op)
  }

  return result
}

function applyOperation(obj: Record<string, unknown>, op: PatchOperation): void {
  const pathParts = op.path.split('/').filter(p => p !== '')
  const parentPath = pathParts.slice(0, -1)
  const key = pathParts[pathParts.length - 1]

  // Navigate to parent
  let parent: Record<string, unknown> | unknown[] = obj
  for (const part of parentPath) {
    if (Array.isArray(parent)) {
      parent = parent[parseInt(part, 10)] as Record<string, unknown> | unknown[]
    } else {
      parent = parent[part] as Record<string, unknown> | unknown[]
    }
  }

  // Apply operation
  switch (op.op) {
    case 'add':
      if (Array.isArray(parent)) {
        const index = key === '-' ? parent.length : parseInt(key, 10)
        parent.splice(index, 0, op.value)
      } else {
        parent[key] = op.value
      }
      break

    case 'remove':
      if (Array.isArray(parent)) {
        parent.splice(parseInt(key, 10), 1)
      } else {
        delete parent[key]
      }
      break

    case 'replace':
      if (Array.isArray(parent)) {
        parent[parseInt(key, 10)] = op.value
      } else {
        parent[key] = op.value
      }
      break

    case 'move':
      // Not implemented for now
      break

    case 'copy':
      // Not implemented for now
      break

    case 'test':
      // Not implemented for now
      break
  }
}

// =============================================================================
// Diff-Mode Prompt
// =============================================================================

export const DIFF_MODE_SYSTEM_PROMPT_ADDITION = `
## Diff-Modus (Optional)

Wenn du nur kleine Änderungen machst, kannst du statt dem kompletten JSON auch einen JSON Patch zurückgeben:

\`\`\`json
{
  "patch": [
    { "op": "replace", "path": "/layout/0/style/background", "value": "#EF4444" },
    { "op": "add", "path": "/layout/0/children/-", "value": { "component": "Button", "text": "New" } }
  ]
}
\`\`\`

Verfügbare Operationen:
- \`add\`: Wert hinzufügen (path: "/array/-" für Ende des Arrays)
- \`remove\`: Wert entfernen
- \`replace\`: Wert ersetzen

Nutze den Patch-Modus für:
- Einzelne Property-Änderungen
- Hinzufügen von einem Element
- Entfernen von Elementen

Nutze vollständiges JSON für:
- Komplexe Umstrukturierungen
- Viele gleichzeitige Änderungen
- Neue Layouts von Grund auf
`

// =============================================================================
// Response Parsing with Diff Support
// =============================================================================

export interface DiffResponse {
  type: 'full' | 'patch'
  intent?: Intent
  patch?: Patch
}

export function parseDiffResponse(response: string, currentIntent: Intent): Intent | null {
  try {
    let jsonStr = response.trim()

    // Remove markdown
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    // Check if it's a patch response
    if (parsed.patch && Array.isArray(parsed.patch)) {
      return applyPatch(currentIntent, parsed.patch)
    }

    // Check if it's a partial Intent (missing some sections)
    // If only some sections are present, merge with current intent
    const hasTokens = 'tokens' in parsed
    const hasComponents = 'components' in parsed
    const hasLayout = 'layout' in parsed
    const isPartial = (hasTokens || hasComponents || hasLayout) &&
                      !(hasTokens && hasComponents && hasLayout)

    if (isPartial) {
      return mergePartialIntent(currentIntent, parsed)
    }

    // Otherwise treat as full intent
    return parsed as Intent
  } catch (e) {
    console.error('Failed to parse diff response:', e)
    return null
  }
}

/**
 * Merge a partial Intent response with the current Intent
 * Missing sections are preserved from the current Intent
 */
export function mergePartialIntent(
  currentIntent: Intent,
  partial: Partial<Intent>
): Intent {
  return {
    tokens: partial.tokens !== undefined
      ? mergeTokens(currentIntent.tokens, partial.tokens)
      : currentIntent.tokens,
    components: partial.components !== undefined
      ? partial.components
      : currentIntent.components,
    layout: partial.layout !== undefined
      ? partial.layout
      : currentIntent.layout,
  }
}

/**
 * Deep merge token definitions
 */
function mergeTokens(
  current: Intent['tokens'],
  update: Intent['tokens']
): Intent['tokens'] {
  return {
    colors: { ...current.colors, ...update.colors },
    spacing: { ...current.spacing, ...update.spacing },
    radii: { ...current.radii, ...update.radii },
    sizes: { ...current.sizes, ...update.sizes },
  }
}

// =============================================================================
// Patch Optimization
// =============================================================================

/**
 * Simplifies a patch by combining operations where possible
 */
export function optimizePatch(patch: Patch): Patch {
  const optimized: Patch = []
  const pathMap = new Map<string, PatchOperation>()

  for (const op of patch) {
    const existing = pathMap.get(op.path)

    if (existing) {
      // Combine operations on same path
      if (existing.op === 'add' && op.op === 'replace') {
        // add + replace = add with new value
        existing.value = op.value
      } else if (existing.op === 'add' && op.op === 'remove') {
        // add + remove = nothing
        pathMap.delete(op.path)
      } else if (existing.op === 'replace' && op.op === 'replace') {
        // replace + replace = replace with new value
        existing.value = op.value
      } else if (existing.op === 'replace' && op.op === 'remove') {
        // replace + remove = remove
        existing.op = 'remove'
        delete existing.value
      } else {
        // Can't optimize, keep both
        optimized.push(existing)
        pathMap.set(op.path, op)
      }
    } else {
      pathMap.set(op.path, op)
    }
  }

  // Add remaining operations
  optimized.push(...pathMap.values())

  return optimized
}

// =============================================================================
// Rollback Support
// =============================================================================

/**
 * Intent history entry for rollback support.
 */
export interface IntentHistoryEntry {
  /** The Intent state */
  intent: Intent
  /** Timestamp when this state was created */
  timestamp: number
  /** Description of the change */
  description: string
  /** Patch that was applied to reach this state (from previous) */
  patchApplied?: Patch
}

/**
 * History manager for Intent rollback support.
 */
export class IntentHistory {
  private history: IntentHistoryEntry[] = []
  private currentIndex = -1
  private readonly maxHistory: number

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory
  }

  /**
   * Push a new state onto the history stack.
   */
  push(intent: Intent, description: string, patch?: Patch): void {
    // Remove any forward history if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    // Add new entry
    this.history.push({
      intent: JSON.parse(JSON.stringify(intent)), // Deep clone
      timestamp: Date.now(),
      description,
      patchApplied: patch,
    })

    this.currentIndex = this.history.length - 1

    // Trim old history if needed
    if (this.history.length > this.maxHistory) {
      const excess = this.history.length - this.maxHistory
      this.history = this.history.slice(excess)
      this.currentIndex -= excess
    }
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.currentIndex > 0
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * Undo to the previous state.
   * @returns The previous Intent state or null if at the beginning
   */
  undo(): Intent | null {
    if (!this.canUndo()) {
      return null
    }

    this.currentIndex--
    return JSON.parse(JSON.stringify(this.history[this.currentIndex].intent))
  }

  /**
   * Redo to the next state.
   * @returns The next Intent state or null if at the end
   */
  redo(): Intent | null {
    if (!this.canRedo()) {
      return null
    }

    this.currentIndex++
    return JSON.parse(JSON.stringify(this.history[this.currentIndex].intent))
  }

  /**
   * Rollback to a specific point in history.
   * @param steps Number of steps to go back (1 = previous, 2 = two states ago, etc.)
   */
  rollback(steps: number): Intent | null {
    const targetIndex = this.currentIndex - steps
    if (targetIndex < 0) {
      return null
    }

    this.currentIndex = targetIndex
    return JSON.parse(JSON.stringify(this.history[this.currentIndex].intent))
  }

  /**
   * Get the current state.
   */
  current(): Intent | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      return null
    }
    return JSON.parse(JSON.stringify(this.history[this.currentIndex].intent))
  }

  /**
   * Get all history entries (for debugging/display).
   */
  getHistory(): IntentHistoryEntry[] {
    return this.history.map(entry => ({
      ...entry,
      intent: JSON.parse(JSON.stringify(entry.intent)),
    }))
  }

  /**
   * Get number of history entries.
   */
  size(): number {
    return this.history.length
  }

  /**
   * Get current position in history.
   */
  position(): number {
    return this.currentIndex
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
  }
}

/**
 * Generate a reverse patch (for undo operations).
 */
export function generateReversePatch(patch: Patch, originalIntent: Intent): Patch {
  const reversePatch: Patch = []

  // Process in reverse order
  for (let i = patch.length - 1; i >= 0; i--) {
    const op = patch[i]
    const originalValue = getValueAtPath(originalIntent, op.path)

    switch (op.op) {
      case 'add':
        // Reverse of add is remove
        reversePatch.push({ op: 'remove', path: op.path })
        break

      case 'remove':
        // Reverse of remove is add (with original value)
        reversePatch.push({ op: 'add', path: op.path, value: originalValue })
        break

      case 'replace':
        // Reverse of replace is replace (with original value)
        reversePatch.push({ op: 'replace', path: op.path, value: originalValue })
        break

      // Note: move, copy, test are not commonly used
    }
  }

  return reversePatch
}

/**
 * Get value at a JSON path in an Intent.
 */
function getValueAtPath(intent: Intent, path: string): unknown {
  const pathParts = path.split('/').filter(p => p !== '')
  let current: unknown = intent

  for (const part of pathParts) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (Array.isArray(current)) {
      const index = parseInt(part, 10)
      current = current[index]
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Create a global history instance for the application.
 */
let globalIntentHistory: IntentHistory | null = null

export function getGlobalIntentHistory(): IntentHistory {
  if (!globalIntentHistory) {
    globalIntentHistory = new IntentHistory()
  }
  return globalIntentHistory
}

export function clearGlobalIntentHistory(): void {
  globalIntentHistory?.clear()
}
