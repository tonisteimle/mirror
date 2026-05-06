/**
 * Each-Template Drag-Guard Tests
 *
 * Verifies that drag-reorder is blocked for nodes rendered inside an `each`
 * loop. The guard lives in `studio/drop/drop-service.ts` (handleDrop) and
 * is wired via `DropContext.isInEachTemplate` in `studio/drop/app-adapter.ts`.
 *
 * Why blocking matters: an each-rendered card is a single source template
 * cloned per data row. Moving one of the rendered copies has no clean
 * source-side semantics — there is nothing per-instance to reorder, and
 * silently mutating the data block (or unrolling the loop) would surprise
 * the user. So the drop service refuses the move and tells the user where
 * to change ordering instead.
 *
 * The demo project (`studio/storage/project-actions.ts` DEFAULT_PROJECT) is
 * an ideal fixture: three iterated feature cards plus non-iterated siblings
 * (the "Demo App" Text and the back/detail flow).
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Fixtures
// =============================================================================

/**
 * Minimal each-loop fixture distilled from the demo: three cards generated
 * from a `features` data block, plus a non-iterated Text sibling on top.
 */
const EACH_FIXTURE = `features:
  icon "home",   title "Welcome"
  icon "layers", title "Components"
  icon "eye",    title "Preview"

Frame pad 16, gap 12
  Text "Demo App", fs 20, weight bold

  each feature in $features
    Frame hor, gap 8, pad 12, bg #27272a, rad 8
      Icon feature.icon, ic #2271C1, is 20
      Text feature.title, fs 16, weight 500`

// =============================================================================
// Helpers
// =============================================================================

/**
 * Try to move `sourceId` into `targetId` at `index`. Returns true if the
 * move succeeded (interactions.moveElement throws on failure), false if it
 * was rejected by the drop service.
 */
async function tryMove(
  api: TestAPI,
  sourceId: string,
  targetId: string,
  index: number
): Promise<boolean> {
  try {
    await api.interact.moveElement(sourceId, targetId, index)
    return true
  } catch {
    return false
  }
}

/**
 * Walk the live SourceMap and return all nodeIds whose source line lives
 * inside an `each` template. Uses the same `isEachTemplate` flag the drop
 * service guards on.
 */
function findEachTemplateIds(): string[] {
  const sourceMap = (window as any).studio?.state?.get()?.sourceMap
  if (!sourceMap) return []
  const ids: string[] = []
  // The source-map stores nodes either as a Map (`nodes`) or behind
  // `getNodeById`. Walk via `nodes` when available, else fall back to a
  // direct lookup by querying `[data-mirror-id]` and asking the source-map
  // about each candidate.
  const allNodes = sourceMap.nodes
  if (allNodes && typeof allNodes.forEach === 'function') {
    allNodes.forEach((node: { isEachTemplate?: boolean }, id: string) => {
      if (node.isEachTemplate) ids.push(id)
    })
  } else {
    document.querySelectorAll('[data-mirror-id]').forEach(el => {
      const id = (el as HTMLElement).dataset.mirrorId
      if (!id) return
      const node = sourceMap.getNodeById?.(id)
      if (node?.isEachTemplate) ids.push(id)
    })
  }
  return ids
}

// =============================================================================
// Tests
// =============================================================================

export const eachTemplateGuardTests: TestCase[] = describe('Each-Template Drag Guard', [
  // ---------------------------------------------------------------------------
  // 1. Reorder of an each-rendered card is blocked
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Each-rendered card cannot be reordered (drop is rejected)',
    EACH_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const sourceBefore = api.editor.getCode()

      // Use the SourceMap (same flag the drop guard inspects) to locate the
      // each template's nodeId. DOM heuristics would be brittle because the
      // each loop emits multiple DOM nodes that all map back to one source
      // template.
      const eachIds = findEachTemplateIds()
      api.assert.ok(
        eachIds.length >= 1,
        `Expected at least 1 each-template node in source map, found ${eachIds.length}`
      )

      const templateId = eachIds[0]

      // Try to move the each-template node to position 0 of the parent.
      const moved = await tryMove(api, templateId, 'node-1', 0)
      api.assert.ok(!moved, `Move on each-template node ${templateId} should be rejected`)

      // Source must be byte-identical.
      const sourceAfter = api.editor.getCode()
      api.assert.equals(sourceAfter, sourceBefore, 'Source must not change after blocked move')
    }
  ),

  // ---------------------------------------------------------------------------
  // 2. Non-each siblings still reorder normally (control case)
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Non-each elements still reorder freely (control)',
    `Frame pad 16, gap 12
  Text "Alpha"
  Text "Beta"
  Text "Gamma"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Move "Gamma" (node-4) to position 0 — should succeed because no each loop.
      const moved = await tryMove(api, 'node-4', 'node-1', 0)
      api.assert.ok(moved, 'Move on plain children must succeed')

      const code = api.editor.getCode()
      // Gamma should now appear before Alpha in source order.
      const gammaIdx = code.indexOf('Gamma')
      const alphaIdx = code.indexOf('Alpha')
      api.assert.ok(
        gammaIdx >= 0 && alphaIdx >= 0 && gammaIdx < alphaIdx,
        `Expected Gamma before Alpha, got: ${code}`
      )
    }
  ),

  // ---------------------------------------------------------------------------
  // 3. Guard is scoped: only each-template nodes are flagged, not their
  //    non-each siblings in the same parent.
  // ---------------------------------------------------------------------------
  testWithSetup(
    'isInEachTemplate predicate is scoped to each-rendered nodes',
    EACH_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const sourceMap = (window as any).studio?.state?.get()?.sourceMap
      api.assert.ok(sourceMap, 'SourceMap must be available after compile')

      const allIds: string[] = []
      document.querySelectorAll('[data-mirror-id]').forEach(el => {
        const id = (el as HTMLElement).dataset.mirrorId
        if (id && !allIds.includes(id)) allIds.push(id)
      })

      let eachCount = 0
      let nonEachCount = 0
      for (const id of allIds) {
        const node = sourceMap.getNodeById?.(id)
        if (!node) continue
        if (node.isEachTemplate) eachCount++
        else nonEachCount++
      }

      api.assert.ok(eachCount >= 1, `Expected ≥1 each-template node, got ${eachCount}`)
      api.assert.ok(nonEachCount >= 1, `Expected ≥1 non-each node, got ${nonEachCount}`)
    }
  ),
])

export default eachTemplateGuardTests
