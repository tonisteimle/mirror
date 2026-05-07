/**
 * Three-way consistency: Code ↔ Preview ↔ Panel must agree.
 *
 * Every existing sync test is pair-wise (Code↔Preview, Code↔Panel, or
 * Panel↔Code). None assert that ALL THREE views agree at a single
 * point in time. The dominant failure mode of a 3-way sync system is
 * exactly this: two views agree, the third is stale, the user edits
 * the stale third view, and writes a property to the wrong node.
 *
 * This suite asserts after every transition:
 *   1. Editor source contains the expected literal on the expected line
 *   2. Preview DOM has the expected node with the expected computed style
 *   3. Panel state shows the expected selectedNodeId AND property value
 *
 * Helper `assertThreeWayConsistent` runs all three checks; failure
 * messages name which view diverged.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

const SETTLE_MS = 250

interface Expected {
  /** Selected node — must match in panel state */
  nodeId: string
  /** A property value the panel must report for the selected node */
  panelProp: { name: string; value: string }
  /** A substring the editor source must contain on a specific line */
  sourceLine: { line: number; mustContain: string }
  /** A computed-style assertion against the preview DOM node */
  previewCss?: { property: string; value: string }
}

function getComputedCssValue(nodeId: string, prop: string): string {
  const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
  if (!el) return ''
  return window.getComputedStyle(el)[prop as keyof CSSStyleDeclaration] as string
}

function assertThreeWayConsistent(api: TestAPI, expected: Expected, label: string): void {
  // 1. Panel
  const panelId = api.panel.property.getSelectedNodeId()
  api.assert.equals(panelId, expected.nodeId, `${label}: panel selectedNodeId mismatch`)
  const panelValue = api.panel.property.getPropertyValue(expected.panelProp.name)
  api.assert.equals(
    panelValue,
    expected.panelProp.value,
    `${label}: panel.${expected.panelProp.name} mismatch`
  )

  // 2. Editor
  const code = api.editor.getCode()
  const lines = code.split('\n')
  const line = lines[expected.sourceLine.line - 1]
  api.assert.ok(
    line !== undefined,
    `${label}: editor line ${expected.sourceLine.line} missing. Source:\n${code}`
  )
  api.assert.ok(
    line.includes(expected.sourceLine.mustContain),
    `${label}: editor line ${expected.sourceLine.line} must contain "${expected.sourceLine.mustContain}". Got: "${line}"`
  )

  // 3. Preview DOM
  const el = document.querySelector(`[data-mirror-id="${expected.nodeId}"]`) as HTMLElement | null
  api.assert.ok(el !== null, `${label}: preview node ${expected.nodeId} not in DOM`)
  if (expected.previewCss) {
    const actual = getComputedCssValue(expected.nodeId, expected.previewCss.property)
    api.assert.ok(
      actual === expected.previewCss.value,
      `${label}: preview ${expected.previewCss.property} mismatch. Expected ${expected.previewCss.value}, got ${actual}`
    )
  }
}

export const threeWayConsistencyTests: TestCase[] = describe('3-way sync: Code ↔ Preview ↔ Panel', [
  testWithSetup(
    'Click in preview → all three views agree on the clicked node',
    `Frame gap 8
  Button "A", bg #2271C1, col white
  Button "B", bg #ef4444, col white`,
    async (api: TestAPI) => {
      await api.interact.click('node-3')
      await api.utils.delay(SETTLE_MS)

      assertThreeWayConsistent(
        api,
        {
          nodeId: 'node-3',
          panelProp: { name: 'bg', value: '#ef4444' },
          sourceLine: { line: 3, mustContain: '#ef4444' },
          previewCss: { property: 'backgroundColor', value: 'rgb(239, 68, 68)' },
        },
        'click→3'
      )
    }
  ),

  testWithSetup(
    'Cursor move in editor → all three views agree on the cursor-line node',
    `Frame gap 8
  Text "First", col white
  Text "Second", col #888`,
    async (api: TestAPI) => {
      api.editor.setCursor(3, 1)
      await api.utils.delay(SETTLE_MS)
      await api.panel.property.waitForSelectedNodeId(2000)

      assertThreeWayConsistent(
        api,
        {
          nodeId: 'node-3',
          panelProp: { name: 'col', value: '#888' },
          sourceLine: { line: 3, mustContain: '#888' },
          // Note: computed-style for col on Text — browser may report
          // any of several rgb forms; skip CSS check here since the
          // panel + editor agreement is the load-bearing assertion.
        },
        'cursor→3'
      )
    }
  ),

  testWithSetup(
    'Panel.setProperty → editor source AND preview DOM both update',
    `Frame
  Button "X", bg #333, col white`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SETTLE_MS)

      const ok = await api.panel.property.setProperty('bg', '#10b981')
      api.assert.ok(ok, 'setProperty must succeed')
      await api.utils.waitForCompile()
      await api.utils.delay(SETTLE_MS)

      assertThreeWayConsistent(
        api,
        {
          nodeId: 'node-2',
          panelProp: { name: 'bg', value: '#10b981' },
          sourceLine: { line: 2, mustContain: '#10b981' },
          previewCss: { property: 'backgroundColor', value: 'rgb(16, 185, 129)' },
        },
        'panel-set→all'
      )
    }
  ),

  testWithSetup(
    'Code edit + cursor move → panel reflects new value AND new selection in one transition',
    `Frame
  Button "X", bg #333, col white`,
    async (api: TestAPI) => {
      // Pre-select node-1 so we can prove cursor move actually
      // changed selection (not that it was already there).
      await api.interact.click('node-1')
      await api.utils.delay(SETTLE_MS)

      await api.editor.setCode(`Frame
  Button "X", bg #2271C1, col white`)
      api.editor.setCursor(2, 1)
      await api.utils.waitForCompile()
      await api.utils.delay(SETTLE_MS)
      await api.panel.property.waitForSelectedNodeId(2000)

      assertThreeWayConsistent(
        api,
        {
          nodeId: 'node-2',
          panelProp: { name: 'bg', value: '#2271C1' },
          sourceLine: { line: 2, mustContain: '#2271C1' },
          previewCss: { property: 'backgroundColor', value: 'rgb(34, 113, 193)' },
        },
        'edit+cursor→all'
      )
    }
  ),

  testWithSetup(
    'Sibling-switch via cursor: panel + DOM swap to new sibling',
    `Frame gap 8
  Button "A", bg #2271C1
  Button "B", bg #ef4444`,
    async (api: TestAPI) => {
      // Start on A.
      api.editor.setCursor(2, 1)
      await api.utils.delay(SETTLE_MS)
      await api.panel.property.waitForSelectedNodeId(2000)
      assertThreeWayConsistent(
        api,
        {
          nodeId: 'node-2',
          panelProp: { name: 'bg', value: '#2271C1' },
          sourceLine: { line: 2, mustContain: '#2271C1' },
        },
        'pre-switch (A)'
      )

      // Switch to B.
      api.editor.setCursor(3, 1)
      await api.utils.delay(SETTLE_MS)
      assertThreeWayConsistent(
        api,
        {
          nodeId: 'node-3',
          panelProp: { name: 'bg', value: '#ef4444' },
          sourceLine: { line: 3, mustContain: '#ef4444' },
        },
        'post-switch (B)'
      )
    }
  ),

  testWithSetup(
    'Panel write does not corrupt three-way state (no double-source, panel reads new)',
    `Frame
  Button "X", bg #333, w 100, h 50`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SETTLE_MS)

      // Two writes in quick succession. After both, the panel must
      // read the LAST value, source must show it ONCE per property,
      // and preview DOM must reflect it.
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(SETTLE_MS)
      await api.panel.property.setProperty('w', '200')
      await api.utils.waitForCompile()
      await api.utils.delay(SETTLE_MS)

      const code = api.editor.getCode()
      // No duplicate `bg` or `w` props on the line.
      const line2 = code.split('\n')[1]
      const bgCount = (line2.match(/\bbg\b/g) || []).length
      const wCount = (line2.match(/\bw\b/g) || []).length
      api.assert.ok(bgCount === 1, `bg must appear once, got ${bgCount} in: ${line2}`)
      api.assert.ok(wCount === 1, `w must appear once, got ${wCount} in: ${line2}`)

      assertThreeWayConsistent(
        api,
        {
          nodeId: 'node-2',
          panelProp: { name: 'bg', value: '#2271C1' },
          sourceLine: { line: 2, mustContain: '#2271C1' },
          previewCss: { property: 'width', value: '200px' },
        },
        'two-writes→all'
      )
    }
  ),

  // ---------- Race conditions / edge cases ----------

  testWithSetup(
    'Code edit deletes selected node → three-way consistent after invalidation',
    `Frame
  Button "doomed", bg #2271C1
  Button "survivor", bg #ef4444`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SETTLE_MS)
      api.assert.equals(
        api.panel.property.getSelectedNodeId(),
        'node-2',
        'precondition: doomed selected'
      )

      // Edit removes the doomed node. selection:invalidated must fire,
      // fallback selection runs, panel + preview both adapt.
      await api.editor.setCode(`Frame
  Button "survivor", bg #ef4444`)
      await api.utils.waitForCompile()
      await api.utils.delay(SETTLE_MS)

      // The panel must NOT keep showing #2271C1. Either it falls
      // back to the survivor (now node-2 in the new sourceMap) or
      // up to the Frame, OR clears. In all valid end-states, the
      // panel's currently-shown bg is NOT the doomed value.
      const panelBg = api.panel.property.getPropertyValue('bg')
      api.assert.ok(
        panelBg !== '#2271C1',
        `Panel must release stale doomed bg #2271C1, got ${panelBg}`
      )

      // If the panel is showing a node, that node must be present in
      // both source AND preview DOM.
      const panelId = api.panel.property.getSelectedNodeId()
      if (panelId !== null) {
        const inDom = !!document.querySelector(`[data-mirror-id="${panelId}"]`)
        api.assert.ok(
          inDom,
          `Panel-selected node ${panelId} must exist in preview DOM after invalidation`
        )
      }
    }
  ),

  testWithSetup(
    'Rapid panel writes do not desync (final state consistent across all three)',
    `Frame
  Button "X", bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SETTLE_MS)

      // Five quick bg writes. The 300ms debounce in the panel
      // controller can either coalesce or apply each — either is
      // valid. The invariant: after settle, all three views agree
      // on the FINAL value (#10b981).
      const colors = ['#aaa', '#bbb', '#ccc', '#ddd', '#10b981']
      for (const c of colors) {
        await api.panel.property.setProperty('bg', c)
        await api.utils.delay(50)
      }
      await api.utils.waitForCompile()
      await api.utils.delay(SETTLE_MS)
      await api.utils.waitForCompile()
      await api.utils.delay(SETTLE_MS)

      assertThreeWayConsistent(
        api,
        {
          nodeId: 'node-2',
          panelProp: { name: 'bg', value: '#10b981' },
          sourceLine: { line: 2, mustContain: '#10b981' },
          previewCss: { property: 'backgroundColor', value: 'rgb(16, 185, 129)' },
        },
        'rapid-writes→all'
      )

      // No intermediate values left in source (no `bg #aaa` etc).
      const code = api.editor.getCode()
      for (const stale of ['#aaa', '#bbb', '#ccc', '#ddd']) {
        api.assert.ok(
          !code.includes(stale),
          `Stale color ${stale} must not survive in source. Got:\n${code}`
        )
      }
    }
  ),

  testWithSetup(
    'Cursor move during pending compile lands on the right node post-compile',
    `Frame
  Button "A", bg #333
  Button "B", bg #666`,
    async (api: TestAPI) => {
      // Trigger a recompile via setCode, then immediately move cursor.
      // The cursor sync (50ms debounce) should resolve AFTER compile
      // completes, against the new sourceMap.
      await api.editor.setCode(`Frame
  Button "A", bg #2271C1
  Button "B", bg #ef4444`)
      api.editor.setCursor(3, 1)
      await api.utils.waitForCompile()
      await api.utils.delay(SETTLE_MS)
      await api.panel.property.waitForSelectedNodeId(2000)

      assertThreeWayConsistent(
        api,
        {
          nodeId: 'node-3',
          panelProp: { name: 'bg', value: '#ef4444' },
          sourceLine: { line: 3, mustContain: '#ef4444' },
        },
        'cursor-during-compile→3'
      )
    }
  ),
])
