// @vitest-environment jsdom
/**
 * Studio sync — Slice 26/27/29 Review-Pass regression tests.
 *
 * The Review-Pass uncovered that `studio/sync/component-line-parser.ts`
 * used a hand-rolled `(hover|focus|active|disabled)` regex in three
 * places. Slice 26 widened the schema from 4 to 13 system-states, and
 * the sync layer didn't follow. Effect: cursor inside a `visited:` /
 * `checked:` / `focus-visible:` / `placeholder:` block was reported with
 * `childType: 'nested'` instead of `'state'`, breaking downstream
 * features (Property-Panel, breadcrumbs, code-edit context).
 *
 * These tests pin the fix: the schema-derived `SYSTEM_STATES` set drives
 * the sync layer's state-block detection.
 */

import { describe, it, expect } from 'vitest'
import {
  extractComponentFromLine,
  findParentDefinition,
} from '../../studio/sync/component-line-parser'
import { SYSTEM_STATES } from '../../compiler/schema/parser-helpers'

describe('Studio sync — Slice 26 schema-derived state recognition', () => {
  describe('parent-context detection (cursor inside state block)', () => {
    const cases: Array<[string, string]> = [
      ['hover', 'classic CSS pseudo-class'],
      ['focus', 'classic CSS pseudo-class'],
      ['active', 'classic CSS pseudo-class'],
      ['disabled', 'classic CSS pseudo-class'],
      ['focus-visible', 'Slice 26 widening'],
      ['focus-within', 'Slice 26 widening'],
      ['visited', 'Slice 26 widening'],
      ['checked', 'Slice 26 widening'],
      ['placeholder', 'Slice 26 widening'],
      ['placeholder-shown', 'Slice 26 widening'],
      ['first-child', 'Slice 26 widening'],
      ['last-child', 'Slice 26 widening'],
      ['empty', 'Slice 26 widening'],
    ]
    for (const [state, note] of cases) {
      it(`reports childType='state' for cursor inside \`${state}:\` block (${note})`, () => {
        const source = ['MyComp: bg #333', `  ${state}:`, '    bg #f00'].join('\n')
        // Cursor on the `bg #f00` line (line 2, 0-indexed)
        const ctx = findParentDefinition(source, 2)
        expect(ctx?.childType).toBe('state')
        expect(ctx?.childLabel).toBe(state)
      })
    }
  })

  describe('skip-pattern coverage (state lines are not extracted as components)', () => {
    for (const state of SYSTEM_STATES) {
      it(`extractComponentFromLine returns null for \`${state}:\``, () => {
        // The skip pattern matches `<state>` followed by whitespace-or-EOL.
        // We use the `<state> bg #f00` form which is the inline-property
        // shorthand the skip pattern was designed for.
        expect(extractComponentFromLine(`  ${state} bg #f00`)).toBeNull()
      })
    }
  })

  describe('schema drift guard', () => {
    it('every system-state in DSL is recognized by the sync layer', () => {
      // If schema adds a new system state, this test fires before the
      // sync layer can drift. The guard is stricter than the per-state
      // tests above because it tracks the schema source-of-truth.
      const sample = [...SYSTEM_STATES][0]
      expect(sample).toBeTruthy()
      expect(SYSTEM_STATES.size).toBeGreaterThanOrEqual(13)
      for (const name of SYSTEM_STATES) {
        const source = ['MyComp: bg #333', `  ${name}:`, '    bg #f00'].join('\n')
        const ctx = findParentDefinition(source, 2)
        expect(ctx?.childType, `state ${name} not recognized`).toBe('state')
      }
    })
  })
})
