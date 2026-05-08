/**
 * Tests for studio/sync/component-line-parser.ts — coverage gaps
 *
 * The existing test file (sync-component-line-parser.test.ts) covers the
 * happy paths but leaves real holes:
 *  - getNodeIdForLine is exported but untested (uses SourceMap.getNodeAtLine)
 *  - SKIP_PATTERNS for `keys`, `data` are untested
 *  - The hover/focus/active/disabled tracking branch in findParentDefinition
 *    (when contextType is set BEFORE finding the definition) was not exercised
 *  - The event-handler tracking branch (`onClick` block, indented inner
 *    statements) was untested
 *  - analyzeNestedLine's `nested` fallback (empty line / pure punctuation)
 *  - Defensive branches where regex match is null but code still runs
 *
 * These tests pin those behaviors so future refactors can't quietly break
 * editor↔preview cursor sync.
 */

import { describe, it, expect } from 'vitest'
import {
  extractComponentFromLine,
  findParentDefinition,
  getNodeIdForLine,
} from '../../studio/sync/component-line-parser'

// =============================================================================
// extractComponentFromLine — additional skip patterns
// =============================================================================

describe('extractComponentFromLine — additional skip patterns', () => {
  it('returns null for keyboard-shortcut lines (`keys ...`)', () => {
    expect(extractComponentFromLine('keys cmd+s save')).toBeNull()
    expect(extractComponentFromLine('  keys arrow-down highlightNext')).toBeNull()
  })

  it('returns null for `data ...` action keyword', () => {
    expect(extractComponentFromLine('data fetch users')).toBeNull()
  })

  it('returns null for `else` control flow', () => {
    expect(extractComponentFromLine('else')).toBeNull()
  })

  it('returns null for `animate` action keyword', () => {
    expect(extractComponentFromLine('animate fade-in')).toBeNull()
  })

  it('returns null for state pseudo-classes prefixed by indent', () => {
    expect(extractComponentFromLine('  state selected')).toBeNull()
    expect(extractComponentFromLine('  hover')).toBeNull()
    expect(extractComponentFromLine('  active')).toBeNull()
    expect(extractComponentFromLine('  disabled')).toBeNull()
  })

  it('returns null for `onkeydown` / `onkeyup` event handlers', () => {
    expect(extractComponentFromLine('onkeydown enter submit')).toBeNull()
    expect(extractComponentFromLine('onkeyup escape close')).toBeNull()
  })
})

describe('extractComponentFromLine — edge cases on naming', () => {
  it('component name with embedded digits', () => {
    expect(extractComponentFromLine('H1 "Title"')).toEqual({ name: 'H1', isDefinition: false })
    expect(extractComponentFromLine('H6:')).toEqual({ name: 'H6', isDefinition: true })
  })

  it('returns null for ALL-LOWERCASE keyword that LOOKS like a component', () => {
    // Defensive: "frame" is not a component (must start with uppercase)
    expect(extractComponentFromLine('frame gap 12')).toBeNull()
  })

  it('handles trailing comma after a name', () => {
    expect(extractComponentFromLine('Text,')).toEqual({ name: 'Text', isDefinition: false })
  })

  it('handles end-of-line right after a name (no properties, no colon)', () => {
    expect(extractComponentFromLine('Frame')).toEqual({ name: 'Frame', isDefinition: false })
  })

  it('does NOT match a name followed by a non-space, non-comma, non-colon character', () => {
    // 'Button=' should not match — the regex requires a separator after the name
    expect(extractComponentFromLine('Button=value')).toBeNull()
  })
})

// =============================================================================
// findParentDefinition — under-tested branches
// =============================================================================

describe('findParentDefinition — pseudo-state tracking', () => {
  it('tracks `hover` block when scanning upward (no explicit `state` keyword)', () => {
    // Source:
    // Line 1: Btn:
    // Line 2:   bg #333
    // Line 3:   hover
    // Line 4:     bg #444
    // Line 5:     col white
    const source = `Btn:\n  bg #333\n  hover\n    bg #444\n    col white`

    // Line 5 is inside `hover` block under `Btn:`.
    const result = findParentDefinition(source, 5)
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Btn')
    expect(result?.childType).toBe('state')
    // The `hover` keyword is captured as the label
    expect(result?.childLabel).toBe('hover')
  })

  it('tracks `focus` block', () => {
    const source = `Field:\n  bor 1\n  focus\n    bor 2`
    const result = findParentDefinition(source, 4)
    expect(result?.name).toBe('Field')
    expect(result?.childType).toBe('state')
    expect(result?.childLabel).toBe('focus')
  })

  it('tracks `disabled` block', () => {
    const source = `Btn:\n  bg #333\n  disabled\n    opacity 0.5`
    const result = findParentDefinition(source, 4)
    expect(result?.childType).toBe('state')
    expect(result?.childLabel).toBe('disabled')
  })
})

describe('findParentDefinition — event-handler tracking', () => {
  it('tracks `onclick` block when the inner line is just an action call', () => {
    // Source:
    // Line 1: Btn:
    // Line 2:   onclick
    // Line 3:     toggle selected
    // Line 4:     toast "Saved"
    const source = `Btn:\n  onclick\n    toggle selected\n    toast "Saved"`

    // Line 4 is inside `onclick` block.
    const result = findParentDefinition(source, 4)
    expect(result?.name).toBe('Btn')
    expect(result?.childType).toBe('event')
    expect(result?.childLabel).toBe('onclick')
  })

  it('captures the specific event name (onhover / onkeydown / etc.)', () => {
    const source = `Card:\n  onhover\n    bg #444\n    col white`
    const result = findParentDefinition(source, 4)
    expect(result?.childType).toBe('event')
    expect(result?.childLabel).toBe('onhover')
  })
})

describe('findParentDefinition — analyzeNestedLine fallback', () => {
  it('childType is "child" when the immediate line is a Component-instance', () => {
    // Source: Container has a sub-component Btn directly nested.
    const source = `Container:\n  Btn "Click"`
    const result = findParentDefinition(source, 2)
    expect(result?.childType).toBe('child')
    expect(result?.childLabel).toBe('Btn')
  })

  it('childType is "nested" when the immediate line is neither component nor state/event', () => {
    // The current line is a property only (`pad 8`). Its closest parent is
    // a definition. analyzeNestedLine sees `pad 8` → no match → 'nested'.
    const source = `Card:\n  pad 8`
    const result = findParentDefinition(source, 2)
    expect(result?.childType).toBe('nested')
    expect(result?.childLabel).toBe('nested')
  })
})

describe('findParentDefinition — boundary conditions', () => {
  it('returns null when lineNum is out of range (zero)', () => {
    const source = `Card:\n  Box`
    expect(findParentDefinition(source, 0)).toBeNull()
  })

  it('returns null when lineNum is past last line', () => {
    const source = `Card:\n  Box`
    expect(findParentDefinition(source, 99)).toBeNull()
  })

  it('returns null when lineNum is negative', () => {
    const source = `Card:\n  Box`
    expect(findParentDefinition(source, -1)).toBeNull()
  })

  it('skips empty lines while scanning upward (does NOT terminate at blank)', () => {
    // Blank line in the middle should not stop the scan
    const source = `Card:\n  Box\n\n  Text "x"`
    const result = findParentDefinition(source, 4)
    expect(result?.name).toBe('Card')
  })

  it('returns null when source has no parent definition at all', () => {
    // Indented line with no preceding definition.
    const source = `something\n  indented`
    expect(findParentDefinition(source, 2)).toBeNull()
  })
})

// =============================================================================
// getNodeIdForLine
// =============================================================================

describe('getNodeIdForLine', () => {
  function makeMockSourceMap(map: Record<number, { nodeId: string } | undefined>) {
    return {
      getNodeAtLine: (line: number) => map[line] ?? null,
    } as unknown as Parameters<typeof getNodeIdForLine>[0]
  }

  it('returns the nodeId from sourceMap.getNodeAtLine', () => {
    const sm = makeMockSourceMap({ 5: { nodeId: 'node-42' } })
    expect(getNodeIdForLine(sm, 5)).toBe('node-42')
  })

  it('returns null when SourceMap returns null/undefined', () => {
    const sm = makeMockSourceMap({})
    expect(getNodeIdForLine(sm, 99)).toBeNull()
  })

  it('returns null when SourceMap returns a node WITHOUT nodeId', () => {
    const sm = { getNodeAtLine: () => ({}) } as unknown as Parameters<typeof getNodeIdForLine>[0]
    expect(getNodeIdForLine(sm, 1)).toBeNull()
  })

  it('forwards the line number unchanged to SourceMap.getNodeAtLine', () => {
    const calls: number[] = []
    const sm = {
      getNodeAtLine: (line: number) => {
        calls.push(line)
        return null
      },
    } as unknown as Parameters<typeof getNodeIdForLine>[0]
    getNodeIdForLine(sm, 7)
    getNodeIdForLine(sm, 13)
    expect(calls).toEqual([7, 13])
  })
})

// =============================================================================
// P3 mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven coverage', () => {
  // M1 candidate: invert `lineIndent < searchIndent` in the upward scan
  // → would mistakenly find sibling lines as parents.
  it('mutation guard: parent search uses STRICT-less-than (siblings are NOT parents)', () => {
    // Two sibling components at the same indent — neither should be the
    // other's parent.
    const source = `Wrapper:\n  Box\n  Card`
    const result = findParentDefinition(source, 3) // "  Card"
    // Card's parent must be Wrapper, NOT Box.
    expect(result?.name).toBe('Wrapper')
  })

  // M2 candidate: change `currentIndent === 0` to `currentIndent !== 0`
  // → would never return null for top-level lines.
  it('mutation guard: top-level (indent 0) lines have NO parent', () => {
    const source = `Card:\n  Box\nFooter:`
    // Line 3 = "Footer:" at indent 0 → no parent.
    expect(findParentDefinition(source, 3)).toBeNull()
  })

  // M3 candidate: drop `isDefinition` flag from extractComponentFromLine
  // (always returns false) → extractComponentFromLine for "Card:" would
  // claim it's an instance.
  it('mutation guard: isDefinition is true ONLY when colon is present', () => {
    expect(extractComponentFromLine('Card:')?.isDefinition).toBe(true)
    expect(extractComponentFromLine('Card bg #333')?.isDefinition).toBe(false)
    expect(extractComponentFromLine('Card')?.isDefinition).toBe(false)
  })
})
