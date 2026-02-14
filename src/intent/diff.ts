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

    // Otherwise treat as full intent
    return parsed as Intent
  } catch (e) {
    console.error('Failed to parse diff response:', e)
    return null
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
