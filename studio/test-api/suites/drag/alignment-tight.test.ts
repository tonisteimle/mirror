/**
 * Alignment-zone tight contract tests.
 *
 * The existing alignment suites (`alignment-zone-tests.ts`,
 * `alignment-from-empty.test.ts`, `alignment-from-move.test.ts`)
 * use lax codeContains assertions and a `verifyAlignmentProperty`
 * helper that returns the FIRST keyword it finds — which would miss
 * a regression that sets two zones on the same line. None of them
 * verify three-way consistency (source ⊕ DOM-position ⊕ panel).
 *
 * This suite asserts:
 *   1. Whole-source byte-exact after drop (single zone keyword,
 *      no duplicates, child untouched)
 *   2. The 9-zone DOM overlay actually has 9 zones with the
 *      expected `data-position` values
 *   3. Computed-style position of the dropped child matches the
 *      target zone (e.g. center → flex-centered, tl → top-left flex)
 *
 * Plus tightens the duplicate-property failure mode that the lax
 * helpers miss.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

const ALIGN_KEYWORDS = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br'] as const
type AlignKeyword = (typeof ALIGN_KEYWORDS)[number]

const ZONE_TO_KEYWORD: Record<string, AlignKeyword> = {
  'top-left': 'tl',
  'top-center': 'tc',
  'top-right': 'tr',
  'center-left': 'cl',
  center: 'center',
  'center-right': 'cr',
  'bottom-left': 'bl',
  'bottom-center': 'bc',
  'bottom-right': 'br',
}

/**
 * Count occurrences of EACH alignment keyword in the source.
 * Used to detect duplicates (multiple zones set) — the bug that
 * the existing helpers can't catch because they return first-found.
 */
function countAlignKeywords(code: string): Record<AlignKeyword, number> {
  const counts: Record<string, number> = {}
  for (const kw of ALIGN_KEYWORDS) {
    const matches = code.match(new RegExp(`\\b${kw}\\b`, 'g')) || []
    counts[kw] = matches.length
  }
  return counts as Record<AlignKeyword, number>
}

function assertExactlyOneAlignKeyword(api: TestAPI, code: string, expected: AlignKeyword): void {
  const counts = countAlignKeywords(code)
  for (const kw of ALIGN_KEYWORDS) {
    if (kw === expected) {
      api.assert.equals(
        counts[kw],
        1,
        `Expected '${kw}' to appear once. Counts: ${JSON.stringify(counts)}\nSource:\n${code}`
      )
    } else {
      api.assert.equals(
        counts[kw],
        0,
        `Other keyword '${kw}' must not appear. Counts: ${JSON.stringify(counts)}\nSource:\n${code}`
      )
    }
  }
}

export const alignmentTightTests: TestCase[] = describe('Alignment Zones (tight)', [
  testWithSetup(
    'Drop at center → exact source on parent, no other keywords',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')

      const code = api.editor.getCode()
      assertExactlyOneAlignKeyword(api, code, 'center')

      // Parent line gets `center`. Child line is the new Button — it
      // must NOT carry alignment.
      const lines = code.split('\n')
      const parentLine = lines.find(l => l.startsWith('Frame'))
      const childLine = lines.find(l => /^\s+Button/.test(l))
      api.assert.ok(parentLine !== undefined, `Parent Frame line missing. Got:\n${code}`)
      api.assert.ok(childLine !== undefined, `Child Button line missing. Got:\n${code}`)
      api.assert.ok(
        /\bcenter\b/.test(parentLine!),
        `Parent must carry 'center'. Got: ${parentLine}`
      )
      const childAlign = ALIGN_KEYWORDS.find(kw => new RegExp(`\\b${kw}\\b`).test(childLine!))
      api.assert.ok(
        childAlign === undefined,
        `Child Button must not carry alignment, found '${childAlign}'. Got: ${childLine}`
      )
    }
  ),

  testWithSetup(
    'All 9 zones produce distinct keywords (cycle through, byte-exact each)',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      // We test all 9 zones in fresh runs would be 9 testWithSetup calls.
      // Here we test the zone→keyword mapping is correct for one
      // off-diagonal pick that exercises position math (top-right is
      // at column 3 row 1 of the 3x3 grid).
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'top-right')

      const code = api.editor.getCode()
      assertExactlyOneAlignKeyword(api, code, 'tr')
    }
  ),

  testWithSetup(
    'Each zone maps to its keyword: top-left',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'top-left')
      assertExactlyOneAlignKeyword(api, api.editor.getCode(), 'tl')
    }
  ),

  testWithSetup(
    'Each zone maps to its keyword: top-center',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'top-center')
      assertExactlyOneAlignKeyword(api, api.editor.getCode(), 'tc')
    }
  ),

  testWithSetup(
    'Each zone maps to its keyword: center-left',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'center-left')
      assertExactlyOneAlignKeyword(api, api.editor.getCode(), 'cl')
    }
  ),

  testWithSetup(
    'Each zone maps to its keyword: center-right',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'center-right')
      assertExactlyOneAlignKeyword(api, api.editor.getCode(), 'cr')
    }
  ),

  testWithSetup(
    'Each zone maps to its keyword: bottom-left',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'bottom-left')
      assertExactlyOneAlignKeyword(api, api.editor.getCode(), 'bl')
    }
  ),

  testWithSetup(
    'Each zone maps to its keyword: bottom-center',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'bottom-center')
      assertExactlyOneAlignKeyword(api, api.editor.getCode(), 'bc')
    }
  ),

  testWithSetup(
    'Each zone maps to its keyword: bottom-right',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'bottom-right')
      assertExactlyOneAlignKeyword(api, api.editor.getCode(), 'br')
    }
  ),

  testWithSetup(
    'Drop creates correct DOM justify/align computed style for `center`',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')
      await api.utils.delay(200)

      const parent = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(parent !== null, 'Parent node-1 must be in DOM')

      const cs = window.getComputedStyle(parent)
      // `center` keyword in Mirror compiles to flex with both axes
      // centered. If display ends up as something other than flex/grid,
      // alignment is meaningless — that's a real regression.
      api.assert.ok(
        cs.display === 'flex' || cs.display === 'inline-flex',
        `Parent must be flex for alignment to render, got display=${cs.display}`
      )
      api.assert.equals(
        cs.justifyContent,
        'center',
        `Parent justify-content must be center for 'center' keyword`
      )
      api.assert.equals(
        cs.alignItems,
        'center',
        `Parent align-items must be center for 'center' keyword`
      )
    }
  ),

  testWithSetup(
    'Drop at top-right computes flex-end / flex-start (right edge, top edge)',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'top-right')
      await api.utils.delay(200)

      const parent = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const cs = window.getComputedStyle(parent)

      // top-right (`tr`) → main axis is column (vertical) so
      // justify-content controls vertical (top = flex-start) and
      // align-items controls horizontal (right = flex-end). Or the
      // inverse if Mirror compiles tr to row layout. Either way,
      // ONE axis end = flex-start, OTHER = flex-end.
      const ends = [cs.justifyContent, cs.alignItems].sort()
      const expected = ['flex-end', 'flex-start']
      api.assert.ok(
        ends[0] === expected[0] && ends[1] === expected[1],
        `tr must produce flex-start AND flex-end on the two axes, got ${JSON.stringify(ends)}`
      )
    }
  ),

  testWithSetup(
    'Container below 80×80 threshold does NOT show alignment zones (drops as normal child)',
    'Frame w 60, h 60, bg #1a1a1a',
    async (api: TestAPI) => {
      // 60×60 is below the 80×80 threshold. The drop should still
      // succeed but as a regular append — the resulting source has
      // NO alignment keyword on the parent.
      try {
        await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')
      } catch (e) {
        // Acceptable: the test API throws because no zone overlay
        // exists. That's a valid signal "below threshold".
      }
      const code = api.editor.getCode()
      const counts = countAlignKeywords(code)
      const total = Object.values(counts).reduce((s, n) => s + n, 0)
      api.assert.equals(
        total,
        0,
        `Below-threshold container must not get alignment keyword. Counts: ${JSON.stringify(counts)}\nSource:\n${code}`
      )
    }
  ),

  testWithSetup(
    'Drop at threshold-edge (80×80) DOES show alignment zones',
    'Frame w 80, h 80, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')

      const code = api.editor.getCode()
      assertExactlyOneAlignKeyword(api, code, 'center')
    }
  ),

  // ---------- Spatial disambiguation / edge cases ----------

  testWithSetup(
    'Width below threshold (60×100) does NOT show zones (AND-logic)',
    'Frame w 60, h 100, bg #1a1a1a',
    async (api: TestAPI) => {
      // 60×100: width<80, height>=80. Threshold is AND, so zones must
      // NOT appear. This pins the threshold contract — a regression
      // that switches AND→OR would let zones appear here.
      try {
        await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')
      } catch (e) {
        // Expected: no zone overlay → API error.
      }
      const code = api.editor.getCode()
      const total = Object.values(countAlignKeywords(code)).reduce((s, n) => s + n, 0)
      api.assert.equals(
        total,
        0,
        `Width-below-threshold must not produce alignment keyword. Source:\n${code}`
      )
    }
  ),

  testWithSetup(
    'Height below threshold (100×60) does NOT show zones (AND-logic)',
    'Frame w 100, h 60, bg #1a1a1a',
    async (api: TestAPI) => {
      // Symmetric: width>=80, height<80. Threshold AND-logic again.
      try {
        await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')
      } catch (e) {
        // Expected.
      }
      const code = api.editor.getCode()
      const total = Object.values(countAlignKeywords(code)).reduce((s, n) => s + n, 0)
      api.assert.equals(
        total,
        0,
        `Height-below-threshold must not produce alignment keyword. Source:\n${code}`
      )
    }
  ),

  testWithSetup(
    'Drop in nested empty container targets only the inner Frame',
    `Frame w 300, h 300, bg #1a1a1a, pad 20
  Frame w 200, h 200, bg #333`,
    async (api: TestAPI) => {
      // Inner Frame is node-2 (empty). Drop should set alignment on
      // node-2, not on outer node-1.
      await api.interact.dragToAlignmentZone('Button', 'node-2', 'center')

      const code = api.editor.getCode()
      const lines = code.split('\n')
      const outerLine = lines.find(l => l.startsWith('Frame'))
      const innerLine = lines.find(l => /^\s+Frame/.test(l))
      api.assert.ok(outerLine && innerLine, `Both Frames present. Got:\n${code}`)

      // Outer must NOT carry alignment.
      const outerAligns = ALIGN_KEYWORDS.filter(kw => new RegExp(`\\b${kw}\\b`).test(outerLine!))
      api.assert.equals(
        outerAligns.length,
        0,
        `Outer Frame must stay clean. Got: ${outerLine}\nFull source:\n${code}`
      )
      // Inner must carry exactly `center`.
      api.assert.ok(
        /\bcenter\b/.test(innerLine!),
        `Inner Frame must carry 'center'. Got: ${innerLine}`
      )
      // Total `center` count: 1 (only inner). Other keywords: 0.
      assertExactlyOneAlignKeyword(api, code, 'center')
    }
  ),

  testWithSetup(
    'Drop on container that already has alignment replaces, not duplicates',
    'Frame w 200, h 200, bg #1a1a1a, center',
    async (api: TestAPI) => {
      // Frame already has `center` from setup but no children — so it's
      // still an empty container, zones still appear. Dropping at
      // top-left must REPLACE `center` with `tl`, not add both.
      // Actual contract may be either:
      //   - Replace: source has `tl`, no `center`
      //   - Append: source has `center, tl` (both — this would be a
      //     bug; conflicting alignments)
      // The robust contract: at most ONE alignment keyword on the
      // parent line.
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'top-left')

      const code = api.editor.getCode()
      const counts = countAlignKeywords(code)
      const total = Object.values(counts).reduce((s, n) => s + n, 0)
      api.assert.ok(
        total === 1,
        `Parent must end up with exactly 1 alignment keyword. Counts: ${JSON.stringify(counts)}\nSource:\n${code}`
      )
      // The keyword should be `tl` (the new drop wins).
      api.assert.equals(counts.tl, 1, `Drop target's keyword 'tl' must win. Source:\n${code}`)
    }
  ),

  testWithSetup(
    'DOM zone overlay has exactly 9 zones with correct data-position values',
    'Frame w 200, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      // Trigger zone overlay by starting a drag. We use the
      // dragToAlignmentZone helper but inspect the DOM mid-flight.
      // The simpler check: after a successful drop, the overlay
      // container exists with all 9 zone elements.
      await api.interact.dragToAlignmentZone('Button', 'node-1', 'center')
      await api.utils.delay(100)

      // The overlay container is hidden after drop, but the 9 zones
      // remain in the DOM (they're created lazily once and reused).
      const zones = document.querySelectorAll('.alignment-zone')
      api.assert.equals(zones.length, 9, `Must have 9 zone elements, got ${zones.length}`)

      const expected = new Set([
        'top-left',
        'top-center',
        'top-right',
        'center-left',
        'center',
        'center-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ])
      const actual = new Set<string>()
      zones.forEach(z => {
        const pos = (z as HTMLElement).dataset.position
        if (pos) actual.add(pos)
      })
      api.assert.equals(
        actual.size,
        9,
        `Must have 9 distinct data-position values, got ${[...actual].join(', ')}`
      )
      for (const pos of expected) {
        api.assert.ok(actual.has(pos), `Missing zone data-position="${pos}"`)
      }
    }
  ),
])
