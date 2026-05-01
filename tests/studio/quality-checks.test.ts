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
    expect(r.violations.length).toBe(1)
    expect(r.violations[0]).toMatchObject({
      propertyName: 'bg',
      hardcodedValue: '#2271C1',
      suggestedToken: '$primary',
    })
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
})

describe('checkRedundancyCompliance', () => {
  it('detects duplicate property on same element', () => {
    const r = checkRedundancyCompliance('Button "X", bg red, bg blue')
    const dups = r.violations.filter(v => v.kind === 'duplicate-property')
    expect(dups.length).toBe(1)
    expect(dups[0].detail).toContain('bg appears 2×')
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
})
