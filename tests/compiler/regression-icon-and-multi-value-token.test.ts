/**
 * Regression tests for compiler bugs that surfaced when refactoring the
 * studio demo project to follow the “gute Mirror-Code” principles.
 *
 *   Bug 1 — `btn.pad: 10 16` lost the second value.
 *   Bug 2 — `as Icon` inheritance dropped the icon-loading hook.
 *   Bug 3 — `is X` did not size the Icon parent <span>.
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler'

describe('multi-value tokens (`btn.pad: 10 16`)', () => {
  it('preserves both values in the emitted CSS variable', () => {
    const out = compile(`
btn.pad: 10 16
Btn as Button: pad $btn, bg #2271C1
Btn "Hello"
`)
    expect(out).toContain('--btn-pad: 10px 16px;')
    expect(out).toContain(`'padding': 'var(--btn-pad)'`)
  })

  it('handles three-value (top, horizontal, bottom) shorthand', () => {
    const out = compile(`
section.pad: 12 24 8
Hero as Frame: pad $section
Hero
`)
    expect(out).toContain('--section-pad: 12px 24px 8px;')
  })
})

describe('`as Icon` inheritance triggers loadIcon', () => {
  it('emits _runtime.loadIcon for components that inherit `as Icon`', () => {
    const out = compile(`
primary.ic: #2271C1
icon.is: 20
FeatureIcon as Icon: ic $primary, is $icon
Frame
  FeatureIcon "home"
`)
    expect(out).toMatch(/_runtime\.loadIcon\(\s*node_\d+\s*,\s*"home"\s*\)/)
    expect(out).not.toMatch(/node_\d+\.innerHTML\s*=\s*formatInlineMarkdown\(\s*"home"\s*\)/)
  })

  it('inherits properties (color + size) AND renders the SVG', () => {
    const out = compile(`
primary.ic: #2271C1
hero.is: 64
HeroIcon as Icon: ic $primary, is $hero
Frame
  HeroIcon "home"
`)
    expect(out).toContain(`'data-icon-color', "var(--primary-ic)"`)
    expect(out).toContain(`'data-icon-size', "var(--hero-is)"`)
    expect(out).toMatch(/_runtime\.loadIcon\(\s*node_\d+\s*,\s*"home"\s*\)/)
  })
})

describe('`is X` sizes the Icon parent span', () => {
  it('emits width/height styles when `is` is a raw number', () => {
    const out = compile(`
Frame
  Icon "home", is 64
`)
    expect(out).toMatch(/'width':\s*'64px'/)
    expect(out).toMatch(/'height':\s*'64px'/)
  })

  it('emits CSS-var width/height when `is` is a token reference', () => {
    const out = compile(`
hero.is: 64
HeroIcon as Icon: ic #2271C1, is $hero
Frame
  HeroIcon "home"
`)
    expect(out).toMatch(/'width':\s*'var\(--hero-is\)'/)
    expect(out).toMatch(/'height':\s*'var\(--hero-is\)'/)
  })
})
