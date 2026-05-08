/**
 * Tests für studio/agent/quality-checks.ts
 *
 * Anchor-Tests für die drei AST-basierten Quality-Checks (token, component,
 * redundancy). Fokus: Multi-Value-Properties, Suffix-Mapping, Component-
 * Inheritance-Chain, Wrapper-Detection, Canvas-Inheritance.
 */

import { describe, it, expect } from 'vitest'
import {
  checkTokenCompliance,
  checkComponentCompliance,
  checkRedundancyCompliance,
} from '../../studio/agent/quality-checks'

describe('checkTokenCompliance', () => {
  it('detects single-value hardcoded match', () => {
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    const r = checkTokenCompliance('Button "X", bg #2271C1', tokens)
    expect(r.violations).toHaveLength(1)
    // Sharp: full-shape equality, not toMatchObject — catches new fields
    // sneaking in or `reason` flipping silently.
    expect(r.violations[0]).toEqual({
      line: 1,
      elementName: 'Button',
      propertyName: 'bg',
      hardcodedValue: '#2271C1',
      suggestedToken: '$primary',
      reason: 'hardcoded-equals-token',
    })
    expect(r.pass).toBe(false)
  })

  it('detects multi-value match: pad 12 24 with m.pad: 12 → flags pad=12', () => {
    const tokens = { 't.tok': 'm.pad: 12\nl.pad: 16' }
    const r = checkTokenCompliance('Button "X", pad 12 24', tokens)
    // The "12" in "pad 12 24" matches m.pad → 1 violation. The "24" has
    // no token match → silent.
    const padViolations = r.violations.filter(v => v.propertyName === 'pad')
    expect(padViolations.length).toBe(1)
    expect(padViolations[0].hardcodedValue).toBe('12')
    expect(padViolations[0].suggestedToken).toBe('$m')
  })

  it('detects both values in pad 12 16 when both have tokens', () => {
    const tokens = { 't.tok': 'm.pad: 12\nl.pad: 16' }
    const r = checkTokenCompliance('Button "X", pad 12 16', tokens)
    const padViolations = r.violations.filter(v => v.propertyName === 'pad')
    expect(padViolations.length).toBe(2)
    expect(padViolations.map(v => v.suggestedToken).sort()).toEqual(['$l', '$m'])
  })

  it('respects suffix-fallback: ic falls back on .col tokens', () => {
    const tokens = { 't.tok': 'accent.col: #ef4444' }
    const r = checkTokenCompliance('Icon "x", ic #ef4444', tokens)
    expect(r.violations.length).toBe(1)
    expect(r.violations[0].suggestedToken).toBe('$accent')
  })

  it('skips obvious keywords like "full", "bold"', () => {
    const tokens = { 't.tok': 'wide.w: full' }
    const r = checkTokenCompliance('Frame w full', tokens)
    expect(r.violations.length).toBe(0)
  })

  it('passes when no tokens are available', () => {
    const r = checkTokenCompliance('Button "X", bg #2271C1', {})
    expect(r.pass).toBe(true)
  })

  it('skips token references (already token)', () => {
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    const r = checkTokenCompliance('Button "X", bg $primary', tokens)
    expect(r.violations.length).toBe(0)
  })

  // ---------- P2 coverage ----------

  it('does not produce false positives when value has no matching token', () => {
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    // Source uses #ABCDEF — no token matches → must be silent.
    const r = checkTokenCompliance('Button "X", bg #ABCDEF', tokens)
    expect(r.violations).toEqual([])
    expect(r.pass).toBe(true)
  })

  it('uses tokens defined in the source file itself, not just in project files', () => {
    // No projectFiles — the token comes from the same source.
    const r = checkTokenCompliance('primary.bg: #2271C1\n\nButton "X", bg #2271C1', {})
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0].suggestedToken).toBe('$primary')
  })

  it('skips component definitions (mixin sources, not consumers)', () => {
    // PrimaryBtn definition uses #2271C1 hardcoded — but that's the SOURCE
    // OF TRUTH for the design system, not a duplicate. Lock in the skip.
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    const src = 'PrimaryBtn as Button: bg #2271C1\n\nButton "Use"'
    const r = checkTokenCompliance(src, tokens)
    // No violation against the PrimaryBtn definition.
    expect(r.violations).toEqual([])
  })

  it('detects hardcoded match in numeric property (e.g. fs 14)', () => {
    const tokens = { 't.tok': 'body.fs: 14' }
    const r = checkTokenCompliance('Text "Hi", fs 14', tokens)
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0].suggestedToken).toBe('$body')
    expect(r.violations[0].hardcodedValue).toBe('14')
  })

  it('walks into Each-loops and flags hardcoded values inside', () => {
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    const src = 'list:\n  a: 1\n\neach item in $list\n  Button "X", bg #2271C1'
    const r = checkTokenCompliance(src, tokens)
    expect(r.violations).toHaveLength(1)
  })

  it('walks into conditional branches (if/else)', () => {
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    // Both branches contain a hardcoded value matching primary.bg.
    const src = 'flag: true\n\nif flag\n  Button "yes", bg #2271C1\nelse\n  Button "no", bg #2271C1'
    const r = checkTokenCompliance(src, tokens)
    expect(r.violations.length).toBe(2)
  })

  it('summary reports 0 violations as "clean" with token count', () => {
    const tokens = { 't.tok': 'primary.bg: #2271C1\nsecondary.bg: #f00' }
    const r = checkTokenCompliance('Button "X", bg $primary', tokens)
    expect(r.summary).toContain('clean')
    expect(r.summary).toContain('2 tokens available')
  })

  it('summary lists each violation with line/element/property/suggested', () => {
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    const r = checkTokenCompliance('Button "X", bg #2271C1', tokens)
    // Format: "L1 Button bg=#2271C1 → $primary" — verify the human-readable form.
    expect(r.summary).toMatch(/L1 Button bg=#2271C1 → \$primary/)
  })

  it('passes silently for empty source', () => {
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    const r = checkTokenCompliance('', tokens)
    expect(r.pass).toBe(true)
    expect(r.violations).toEqual([])
  })

  it('skips property-set tokens (no suffix → not eligible)', () => {
    // `cardstyle: pad 16, bg #fff` is a property-set, not a single-value token.
    // It must NOT trigger token-suggestions.
    const tokens = { 't.tok': 'cardstyle: pad 16, bg #fff' }
    const r = checkTokenCompliance('Frame pad 16, bg #fff', tokens)
    expect(r.violations).toEqual([])
  })

  it('attributes violations to the correct line within multi-line source', () => {
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    const src = 'Frame gap 12\n  Text "ok"\n  Button "X", bg #2271C1'
    const r = checkTokenCompliance(src, tokens)
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0].line).toBe(3) // the Button is on line 3
  })
})

describe('checkComponentCompliance', () => {
  it('detects inline element matching a component', () => {
    const components = {
      'c.com': 'PrimaryBtn as Button: bg #2271C1, col white',
    }
    const r = checkComponentCompliance('Button "Save", bg #2271C1, col white', components)
    expect(r.violations.length).toBe(1)
    expect(r.violations[0].suggestedComponent).toBe('PrimaryBtn')
  })

  it('follows inheritance chain via primitive field', () => {
    const components = {
      'c.com': 'Btn as Button: pad 12, rad 6\nPrimaryBtn as Btn: bg #2271C1, col white',
    }
    // Inline writes ALL of Btn's + PrimaryBtn's effective props → should
    // flag PrimaryBtn (more specific match).
    const r = checkComponentCompliance(
      'Button "Save", pad 12, rad 6, bg #2271C1, col white',
      components
    )
    expect(r.violations.length).toBe(1)
    expect(r.violations[0].suggestedComponent).toBe('PrimaryBtn')
  })

  it('does not flag the component instance itself', () => {
    const components = {
      'c.com': 'PrimaryBtn as Button: bg #2271C1, col white',
    }
    const r = checkComponentCompliance('PrimaryBtn "Save"', components)
    expect(r.violations.length).toBe(0)
  })

  it('passes when no components are available', () => {
    const r = checkComponentCompliance('Button "X", bg #2271C1', {})
    expect(r.pass).toBe(true)
  })

  // ---------- P2 coverage ----------

  it('does NOT flag when inline element has only SOME of the component props', () => {
    // PrimaryBtn requires bg AND col; inline only sets bg → not a match.
    const components = {
      'c.com': 'PrimaryBtn as Button: bg #2271C1, col white',
    }
    const r = checkComponentCompliance('Button "Save", bg #2271C1', components)
    expect(r.violations).toEqual([])
  })

  it('does NOT flag when value differs (component has bg blue, inline has bg red)', () => {
    const components = {
      'c.com': 'PrimaryBtn as Button: bg #2271C1, col white',
    }
    const r = checkComponentCompliance('Button "Save", bg red, col white', components)
    expect(r.violations).toEqual([])
  })

  it('skips empty component definitions (matches anything otherwise)', () => {
    // EmptyBtn has no properties → would match every Button. The check
    // explicitly skips empty defs to avoid this.
    const components = { 'c.com': 'EmptyBtn as Button:' }
    const r = checkComponentCompliance('Button "X", bg red', components)
    expect(r.violations).toEqual([])
  })

  it('picks the most specific component when multiple would match', () => {
    // Both Btn and PrimaryBtn would match; PrimaryBtn has more props →
    // it wins (more specific).
    const components = {
      'c.com': 'Btn as Button: pad 12\nPrimaryBtn as Btn: bg #2271C1, col white',
    }
    const r = checkComponentCompliance('Button "X", pad 12, bg #2271C1, col white', components)
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0].suggestedComponent).toBe('PrimaryBtn')
    // Matched props should include all 3 from the effective primitive.
    expect(r.violations[0].matchedProperties.sort()).toEqual(['bg', 'col', 'pad'])
  })

  it('reports extraProperties for props beyond the component', () => {
    const components = {
      'c.com': 'PrimaryBtn as Button: bg #2271C1, col white',
    }
    // Inline adds rad 6 — that's an extra beyond what PrimaryBtn defines.
    const r = checkComponentCompliance('Button "Save", bg #2271C1, col white, rad 6', components)
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0].extraProperties).toContain('rad')
  })

  it('walks into Each-loops and flags inline elements inside', () => {
    const components = {
      'c.com': 'PrimaryBtn as Button: bg #2271C1, col white',
    }
    const src = 'list:\n  a: 1\n\neach item in $list\n  Button "X", bg #2271C1, col white'
    const r = checkComponentCompliance(src, components)
    expect(r.violations).toHaveLength(1)
  })

  it('walks both then- and else-branches of conditionals', () => {
    const components = {
      'c.com': 'PrimaryBtn as Button: bg #2271C1, col white',
    }
    const src =
      'flag: true\n\nif flag\n  Button "yes", bg #2271C1, col white\nelse\n  Button "no", bg #2271C1, col white'
    const r = checkComponentCompliance(src, components)
    expect(r.violations).toHaveLength(2)
  })

  it('passes silently when component definitions are empty', () => {
    const r = checkComponentCompliance('', { 'c.com': '' })
    expect(r.pass).toBe(true)
  })

  it('summary reports clean state with available count', () => {
    const components = {
      'c.com': 'PrimaryBtn as Button: bg #2271C1, col white',
    }
    const r = checkComponentCompliance('PrimaryBtn "Save"', components)
    expect(r.summary).toMatch(/clean: 1 component\(s\) available/)
  })

  it('summary lists each violation in human-readable form', () => {
    const components = {
      'c.com': 'PrimaryBtn as Button: bg #2271C1, col white',
    }
    const r = checkComponentCompliance('Button "Save", bg #2271C1, col white', components)
    expect(r.summary).toMatch(/L1 Button\(bg,col\) → PrimaryBtn|L1 Button\(col,bg\) → PrimaryBtn/)
  })
})

describe('checkRedundancyCompliance', () => {
  it('detects duplicate property on same element', () => {
    const r = checkRedundancyCompliance('Button "X", bg red, bg blue')
    // Sharp: full list assertion. A regression that flags non-duplicate
    // properties (e.g. content) would silently leak extra violations.
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0]).toEqual({
      line: 1,
      kind: 'duplicate-property',
      elementName: 'Button',
      detail: 'bg appears 2× on this element',
    })
  })

  it('does NOT flag a property that appears only once on an element', () => {
    // Each property appears exactly 1× → no duplicate-property violations.
    // Critical: catches a regression where the count threshold would be
    // weakened (e.g. > 0 instead of > 1).
    const r = checkRedundancyCompliance('Button "Save", bg red, col white, pad 12')
    expect(r.violations.filter(v => v.kind === 'duplicate-property')).toEqual([])
  })

  it('does NOT flag any violation for a clean single-property element', () => {
    // Clean case — no violations of ANY kind.
    const r = checkRedundancyCompliance('Button "X", bg red')
    expect(r.violations).toEqual([])
  })

  it('detects redundant Frame wrapper (no props, single child)', () => {
    const src = 'Frame\n  Text "Hello"'
    const r = checkRedundancyCompliance(src)
    const wrappers = r.violations.filter(v => v.kind === 'redundant-wrapper')
    expect(wrappers.length).toBe(1)
  })

  it('does not flag Frame wrapper with own properties', () => {
    const src = 'Frame pad 12\n  Text "Hello"'
    const r = checkRedundancyCompliance(src)
    const wrappers = r.violations.filter(v => v.kind === 'redundant-wrapper')
    expect(wrappers.length).toBe(0)
  })

  it('does not flag Frame wrapper with multiple children', () => {
    const src = 'Frame\n  Text "A"\n  Text "B"'
    const r = checkRedundancyCompliance(src)
    const wrappers = r.violations.filter(v => v.kind === 'redundant-wrapper')
    expect(wrappers.length).toBe(0)
  })

  it('detects canvas-inherited property re-specified on descendant', () => {
    const src = 'canvas col white\n\nText "Hello", col white'
    const r = checkRedundancyCompliance(src)
    const inherited = r.violations.filter(v => v.kind === 'inherited-redundant')
    expect(inherited.length).toBe(1)
    expect(inherited[0].detail).toContain('col')
  })

  it('does not flag descendant overriding canvas with different value', () => {
    const src = 'canvas col white\n\nText "Hello", col red'
    const r = checkRedundancyCompliance(src)
    const inherited = r.violations.filter(v => v.kind === 'inherited-redundant')
    expect(inherited.length).toBe(0)
  })

  // ---------- P2 coverage ----------

  it('reports the exact count for triple-duplicate property', () => {
    const r = checkRedundancyCompliance('Button "X", bg red, bg blue, bg green')
    const dups = r.violations.filter(v => v.kind === 'duplicate-property')
    expect(dups).toHaveLength(1)
    expect(dups[0].detail).toContain('bg appears 3×')
  })

  it('flags multiple distinct duplicate properties on the same element', () => {
    // Both `bg` and `col` are duplicated → two violations (one per property).
    const r = checkRedundancyCompliance('Button "X", bg red, bg blue, col white, col black')
    const dups = r.violations.filter(v => v.kind === 'duplicate-property')
    expect(dups).toHaveLength(2)
    expect(dups.map(v => v.detail.split(' ')[0]).sort()).toEqual(['bg', 'col'])
  })

  it('does not flag a NAMED Frame wrapper with a single child (named is intentional)', () => {
    // `Frame name MyWrap` has a name (used for state-targeting) — not redundant.
    const src = 'Frame name MyWrap\n  Text "Hello"'
    const r = checkRedundancyCompliance(src)
    const wrappers = r.violations.filter(v => v.kind === 'redundant-wrapper')
    expect(wrappers).toEqual([])
  })

  it('does not flag a Component definition wrapping a single child', () => {
    // Card definition is a mixin source, not an instance — never redundant.
    const src = 'Card:\n  Text "Hello"'
    const r = checkRedundancyCompliance(src)
    const wrappers = r.violations.filter(v => v.kind === 'redundant-wrapper')
    expect(wrappers).toEqual([])
  })

  it('does not flag a Frame wrapper with NO children (presumably a layout-spacer)', () => {
    const src = 'Frame'
    const r = checkRedundancyCompliance(src)
    const wrappers = r.violations.filter(v => v.kind === 'redundant-wrapper')
    expect(wrappers).toEqual([])
  })

  it('detects nested redundant wrappers (Frame > Frame > Text)', () => {
    // Inner Frame is bare with 1 child (Text); outer Frame is bare with 1 child (inner Frame).
    // BOTH should be flagged.
    const src = 'Frame\n  Frame\n    Text "Hello"'
    const r = checkRedundancyCompliance(src)
    const wrappers = r.violations.filter(v => v.kind === 'redundant-wrapper')
    expect(wrappers).toHaveLength(2)
  })

  it('canvas alias `color` is matched against descendant `col` (alias normalisation)', () => {
    // The check normalises `color` → `col` so both forms are interchangeable.
    const src = 'canvas color white\n\nText "Hi", col white'
    const r = checkRedundancyCompliance(src)
    const inherited = r.violations.filter(v => v.kind === 'inherited-redundant')
    expect(inherited).toHaveLength(1)
  })

  it('canvas with multiple inheritable props each matched independently', () => {
    const src = 'canvas col white, font sans, fs 14\n\nText "Hi", col white, font sans, fs 14'
    const r = checkRedundancyCompliance(src)
    const inherited = r.violations.filter(v => v.kind === 'inherited-redundant')
    expect(inherited).toHaveLength(3)
  })

  it('canvas non-inheritable property (e.g. bg) is not flagged on descendant', () => {
    // bg is not in the inheritable set — no violation.
    const src = 'canvas bg #fff\n\nFrame bg #fff\n  Text "Hi"'
    const r = checkRedundancyCompliance(src)
    const inherited = r.violations.filter(v => v.kind === 'inherited-redundant')
    expect(inherited).toEqual([])
  })

  it('walks redundancy checks into Each-loops', () => {
    const src = 'list:\n  a: 1\n\neach item in $list\n  Button "X", bg red, bg blue'
    const r = checkRedundancyCompliance(src)
    const dups = r.violations.filter(v => v.kind === 'duplicate-property')
    expect(dups).toHaveLength(1)
  })

  it('walks redundancy checks into both branches of conditionals', () => {
    const src = 'flag: true\n\nif flag\n  Frame\n    Text "yes"\nelse\n  Frame\n    Text "no"'
    const r = checkRedundancyCompliance(src)
    const wrappers = r.violations.filter(v => v.kind === 'redundant-wrapper')
    expect(wrappers).toHaveLength(2)
  })

  it('summary is "clean" when source has no redundancy', () => {
    const r = checkRedundancyCompliance('Frame pad 12\n  Text "Hi"')
    expect(r.summary).toBe('clean: no redundancy detected')
    expect(r.pass).toBe(true)
  })

  it('summary lists each violation with line/element/kind', () => {
    const r = checkRedundancyCompliance('Button "X", bg red, bg blue')
    expect(r.summary).toMatch(/L1 Button\/duplicate-property:/)
  })

  it('does NOT count synthetic `content` property as duplicate (Text/Button literal)', () => {
    // Text/Button take their literal as a synthetic `content` property —
    // they may have it once. The check explicitly skips `content` from
    // the duplicate detection.
    const src = 'Text "Hello"'
    const r = checkRedundancyCompliance(src)
    expect(r.violations.filter(v => v.kind === 'duplicate-property')).toEqual([])
  })

  it('passes silently for empty source', () => {
    const r = checkRedundancyCompliance('')
    expect(r.violations).toEqual([])
    expect(r.pass).toBe(true)
  })
})

// ----------------------------------------------------------------------
// P3 branch coverage gaps (from --coverage on quality-checks.ts)
// ----------------------------------------------------------------------

describe('checkComponentCompliance — coverage gaps', () => {
  it('uses components defined in the source file itself (covers in-source branch)', () => {
    // Coverage gap: collectAvailableComponents line 416 (sourceComponents loop).
    // Earlier tests put components in projectComponentFiles only.
    const src =
      'PrimaryBtn as Button: bg #2271C1, col white\n\nButton "Save", bg #2271C1, col white'
    const r = checkComponentCompliance(src, {})
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0].suggestedComponent).toBe('PrimaryBtn')
  })

  it('matches when both component-def and inline element use the same $token', () => {
    // Coverage gap: normaliseValue line 390-391 (TokenReference branch).
    const components = {
      'c.com': 'PrimaryBtn as Button: bg $primary, col white',
    }
    const tokens = { 't.tok': 'primary.bg: #2271C1' }
    const r = checkComponentCompliance('Button "Save", bg $primary, col white', {
      ...components,
      ...tokens,
    })
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0].suggestedComponent).toBe('PrimaryBtn')
  })

  it('does NOT match when component uses $token but inline uses literal hex', () => {
    const components = { 'c.com': 'PrimaryBtn as Button: bg $primary' }
    const r = checkComponentCompliance('Button "Save", bg #2271C1', components)
    expect(r.violations).toEqual([])
  })

  it('walks each-loop without crashing on loopVar property values', () => {
    // Coverage gap: normaliseValue LoopVar branch (line 394-395).
    const src = 'list:\n  a: 1\n\neach item in $list\n  Text item.name'
    expect(() => checkComponentCompliance(src, {})).not.toThrow()
  })
})
