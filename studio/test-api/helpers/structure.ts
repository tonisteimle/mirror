/**
 * Structural test helpers.
 *
 * Mirror reassigns sequential node-IDs on every compile. After a mutation
 * (move, reorder, delete) the IDs from before the mutation are stale.
 * These helpers resolve elements via stable text content instead.
 *
 * Pair with `api.assert.codeEquals(expected)` for source-side strict
 * verification — the helpers below cover DOM-side topology.
 */

import type { TestAPI } from '../types'

/**
 * Resolve the current nodeId of an element identified by its text.
 * Returns null if no match (or multiple matches — uses first).
 */
export function findIdByText(api: TestAPI, text: string, exact = true): string | null {
  const el = api.preview.findByText(text, { exact })
  return el?.nodeId ?? null
}

/**
 * Assert two elements (each identified by text) share the same parent.
 *
 * Use case: after moving Button "Source" into the Frame containing
 * Text "Target", they should be siblings.
 */
export function assertSiblingOf(api: TestAPI, elementText: string, siblingText: string): void {
  const elId = findIdByText(api, elementText)
  const sibId = findIdByText(api, siblingText)

  if (!elId) {
    api.assert.ok(false, `Element with text "${elementText}" not found in DOM`)
    return
  }
  if (!sibId) {
    api.assert.ok(false, `Sibling with text "${siblingText}" not found in DOM`)
    return
  }

  const el = api.preview.inspect(elId)
  const sib = api.preview.inspect(sibId)

  api.assert.equals(
    el?.parent ?? null,
    sib?.parent ?? null,
    `"${elementText}" should share parent with "${siblingText}" (got "${elementText}".parent=${el?.parent}, "${siblingText}".parent=${sib?.parent})`
  )
}

/**
 * Assert element identified by `childText` is a direct child of the
 * element identified by `parentText`.
 */
export function assertChildOfByText(api: TestAPI, childText: string, parentText: string): void {
  const childId = findIdByText(api, childText)
  const parentId = findIdByText(api, parentText)

  if (!childId) {
    api.assert.ok(false, `Child with text "${childText}" not found`)
    return
  }
  if (!parentId) {
    api.assert.ok(false, `Parent with text "${parentText}" not found`)
    return
  }

  api.assert.isChildOf(childId, parentId)
}

/**
 * Assert the order of children within a parent (identified by text).
 * Each `expectedChildTexts` entry is matched against the child's
 * `fullText` (trimmed). Order must match exactly.
 *
 * Useful for verifying insertion index after a move:
 *   assertChildOrder(api, 'OuterFrame', ['Target', 'Source'])
 */
export function assertChildOrder(
  api: TestAPI,
  parentNodeId: string,
  expectedChildTexts: string[]
): void {
  const parent = api.preview.inspect(parentNodeId)
  if (!parent) {
    api.assert.ok(false, `Parent ${parentNodeId} not found`)
    return
  }

  const actual = parent.children.map(id => api.preview.inspect(id)?.fullText.trim() ?? '')

  api.assert.equals(
    JSON.stringify(actual),
    JSON.stringify(expectedChildTexts),
    `Child order in ${parentNodeId} should be ${JSON.stringify(expectedChildTexts)}, got ${JSON.stringify(actual)}`
  )
}

/**
 * Assert the parent of an element (identified by text) has children
 * matching `expectedChildTexts` in order. Combines findByText resolution
 * with order check — useful when the parent has no stable ID/text.
 *
 * Example: after moving Button "Source" into Frame containing Text "Target":
 *   assertParentHasChildren(api, 'Target', ['Target', 'Source'])
 */
export function assertParentHasChildren(
  api: TestAPI,
  anyChildText: string,
  expectedChildTexts: string[]
): void {
  const anchorId = findIdByText(api, anyChildText)
  if (!anchorId) {
    api.assert.ok(false, `Anchor element with text "${anyChildText}" not found`)
    return
  }
  const anchor = api.preview.inspect(anchorId)
  if (!anchor?.parent) {
    api.assert.ok(false, `Anchor "${anyChildText}" has no parent`)
    return
  }
  assertChildOrder(api, anchor.parent, expectedChildTexts)
}
