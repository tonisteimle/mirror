// @vitest-environment jsdom
/**
 * Empty-state helper — single source of truth for the synthetic preview
 * HTML + selection reset that fires when source is empty.
 *
 * The contract this suite enforces:
 *   1. The synthetic wrapper carries `data-mirror-root="true"` AND
 *      `data-component="App"` so the v2 sync-coordinator can distinguish
 *      it from a real user root.
 *   2. The wrapper has `data-mirror-id="node-1"` so child-drop logic in
 *      `code-modifier/children-ops.ts` (which checks parentId === 'node-1'
 *      on empty source) keeps working.
 *   3. `resetSelectionForEmptyCode` always sets breadcrumb to [] — never
 *      to a `[{App}]` stub. The synthetic wrapper isn't a node the user
 *      wrote.
 *   4. Both call paths (studio/app.ts production compile + StudioUpdater
 *      modular orchestrator) go through the same helper so they can't
 *      drift.
 */

import { describe, it, expect } from 'vitest'
import {
  EMPTY_PREVIEW_HTML,
  renderEmptyPreview,
  resetSelectionForEmptyCode,
} from '../../../studio/compile/empty-state'

describe('EMPTY_PREVIEW_HTML', () => {
  it('includes the synthetic App marker attributes the sync-coordinator depends on', () => {
    expect(EMPTY_PREVIEW_HTML).toContain('data-mirror-id="node-1"')
    expect(EMPTY_PREVIEW_HTML).toContain('data-mirror-root="true"')
    expect(EMPTY_PREVIEW_HTML).toContain('data-component="App"')
    expect(EMPTY_PREVIEW_HTML).toContain('data-mirror-name="App"')
    expect(EMPTY_PREVIEW_HTML).toContain('class="mirror-root"')
  })
})

describe('renderEmptyPreview', () => {
  it('mounts the empty-state HTML into the host and clears the host className', () => {
    const host = document.createElement('div')
    host.className = 'should-be-cleared'
    renderEmptyPreview(host)

    expect(host.className).toBe('')
    const root = host.querySelector('[data-mirror-id="node-1"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('data-mirror-root')).toBe('true')
  })
})

describe('resetSelectionForEmptyCode', () => {
  it('clears the selection and sets an EMPTY breadcrumb (not [{App}])', () => {
    const calls: { method: string; args: unknown[] }[] = []
    const manager = {
      clearSelection: () => calls.push({ method: 'clearSelection', args: [] }),
      setBreadcrumb: (items: unknown[]) => calls.push({ method: 'setBreadcrumb', args: [items] }),
    }

    resetSelectionForEmptyCode(manager)

    expect(calls).toEqual([
      { method: 'clearSelection', args: [] },
      { method: 'setBreadcrumb', args: [[]] },
    ])
  })

  it('is a no-op when no SelectionManager is provided', () => {
    expect(() => resetSelectionForEmptyCode(undefined)).not.toThrow()
  })
})
